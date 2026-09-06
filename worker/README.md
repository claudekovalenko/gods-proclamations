# ESV relay

A ~100-line Cloudflare Worker that lets the app show the ESV.

## Why it exists

Crossway's ESV API is built to be called from a web server. Two things follow
from that, and both stop a static page like this app from calling it directly:

1. **The browser blocks it.** The API sends no `Access-Control-Allow-Origin`
   header, so a browser will not hand the response to a page on another origin.
   No key fixes this — it is the browser refusing, not Crossway.
2. **The key cannot live in the page.** Crossway's terms say not to publish an
   access key, and anything shipped to a browser is published.

This Worker is the web server their API expects. It keeps the key as a secret,
calls Crossway, and returns the passage with the CORS header the browser wants.
The key never reaches the page.

## Deploy

You need a free Cloudflare account and a free ESV key from
[api.esv.org](https://api.esv.org/) (create an account, add an application,
copy the key).

```sh
cd worker
npx wrangler login                    # once, opens a browser
npx wrangler secret put ESV_API_KEY   # paste the key when prompted
npx wrangler deploy
```

`deploy` prints a URL like `https://esv-relay.<your-subdomain>.workers.dev`.
Paste that into the app: **Settings → Translation → ESV → ESV relay URL**.

Nothing else to run — it is serverless, and the free tier is far more than this
app will ever use.

## What it does

- Answers `GET /?q=<reference>` with `{"passages": [...], "canonical": "..."}`,
  the same shape the ESV API returns, so the app parses one format either way.
- Requests the same bare prose the app wants: no verse numbers, headings or
  footnotes.
- Caches every passage at the edge for a year. Scripture does not change, and
  it keeps the key well inside Crossway's limit of 5,000 requests a day.
- Refuses requests from pages not in `ALLOWED_ORIGINS`, so nobody else spends
  your quota. Edit that list in `wrangler.toml` if you serve the app elsewhere.

## Checking it

```sh
curl "https://esv-relay.<your-subdomain>.workers.dev/?q=John+3:16"
```

A passage means it works. `"This relay has no ESV key"` means the secret was
not set; `"The relay's ESV key was rejected"` means the key is wrong.

In the app, **Settings → Test my key** does the same check and reports what
came back.
