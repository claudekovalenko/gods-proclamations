/* A relay between the app and Crossway's ESV API.
 *
 * Crossway's API is built to be called from a web server: it sends no CORS
 * headers, so a browser refuses to hand the response to a page on another
 * origin. It also expects the access key to stay on the server — their terms
 * forbid publishing one, and anything shipped to a browser is published.
 *
 * This Worker is that server. It holds the key as a secret, calls Crossway,
 * and answers the app with the one header the browser is waiting for. The key
 * never reaches the page.
 *
 * Deploy:
 *   cd worker
 *   npx wrangler secret put ESV_API_KEY     # paste the key from api.esv.org
 *   npx wrangler deploy
 * then put the URL it prints into the app's settings.
 */

/* Only these pages may spend the key's daily quota. Override with an
   ALLOWED_ORIGINS var (comma separated) in wrangler.toml. */
const DEFAULT_ORIGINS = [
  "https://claudekovalenko.github.io",
  "http://localhost:8765"
];

/* Match what the app asks for: bare prose, no verse numbers or headings. */
const PASSAGE_OPTIONS = {
  "include-passage-references": "false",
  "include-verse-numbers": "false",
  "include-first-verse-numbers": "false",
  "include-footnotes": "false",
  "include-headings": "false",
  "include-short-copyright": "false",
  "include-passage-horizontal-lines": "false",
  "include-heading-horizontal-lines": "false",
  "indent-paragraphs": "0",
  "indent-poetry": "false"
};

const json = (obj, status, headers) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: {...headers, "Content-Type": "application/json; charset=utf-8"}
  });

export default {
  async fetch(request, env, ctx){
    const allowed = (env.ALLOWED_ORIGINS || "")
      .split(",").map(s => s.trim()).filter(Boolean);
    const origins = allowed.length ? allowed : DEFAULT_ORIGINS;

    const origin = request.headers.get("Origin") || "";
    const ok = origins.includes(origin);
    const cors = {
      /* echo the caller's origin when we know it, so the browser accepts it */
      "Access-Control-Allow-Origin": ok ? origin : origins[0],
      "Vary": "Origin",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    };

    if(request.method === "OPTIONS") return new Response(null, {status: 204, headers: cors});
    if(request.method !== "GET") return json({error: "Only GET"}, 405, cors);

    /* A request with no Origin is a curl or a health check — allowed, and
       harmless. One from a page we do not know is someone else spending the
       quota, so turn it away. */
    if(origin && !ok) return json({error: "Origin not allowed"}, 403, cors);

    if(!env.ESV_API_KEY){
      return json({error: "This relay has no ESV key. Run: wrangler secret put ESV_API_KEY"},
                  500, cors);
    }

    const q = (new URL(request.url).searchParams.get("q") || "").trim();
    if(!q) return json({error: "Missing q"}, 400, cors);
    if(q.length > 120) return json({error: "Reference too long"}, 400, cors);

    /* Scripture does not change, so serve repeats from the edge and keep well
       inside Crossway's 5,000 requests a day. */
    const cacheKey = new Request("https://esv-relay.invalid/?q=" + encodeURIComponent(q));
    const cache = caches.default;
    const hit = await cache.match(cacheKey);
    if(hit){
      return new Response(hit.body, {
        headers: {...cors, "Content-Type": "application/json; charset=utf-8", "X-Relay-Cache": "hit"}
      });
    }

    const upstream = new URL("https://api.esv.org/v3/passage/text/");
    upstream.searchParams.set("q", q);
    for(const [k, v] of Object.entries(PASSAGE_OPTIONS)) upstream.searchParams.set(k, v);

    let res;
    try{
      res = await fetch(upstream.toString(), {
        headers: {Authorization: "Token " + env.ESV_API_KEY}
      });
    }catch(e){
      return json({error: "Could not reach the ESV API"}, 502, cors);
    }

    if(res.status === 401) return json({error: "The relay's ESV key was rejected"}, 401, cors);
    if(!res.ok) return json({error: "ESV API error", status: res.status}, 502, cors);

    const data = await res.json();
    const payload = JSON.stringify({
      passages: data.passages || [],
      canonical: data.canonical || q
    });

    ctx.waitUntil(cache.put(cacheKey, new Response(payload, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=31536000"
      }
    })));

    return new Response(payload, {
      headers: {...cors, "Content-Type": "application/json; charset=utf-8", "X-Relay-Cache": "miss"}
    });
  }
};
