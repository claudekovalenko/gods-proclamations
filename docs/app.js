/* Proclamations — app shell.
   No framework, no build step: the whole app is these files plus data.js.

   Two translations. The World English Bible is public domain, so it ships
   with the app and works offline from the first launch. The ESV is not:
   Crossway's guidelines allow quoting it only where the quotations are
   under a quarter of the work, which an app made entirely of scripture is
   not. The sanctioned route is their own API, called with a key belonging
   to the reader — so ESV text is fetched at runtime with a key kept on the
   device, never bundled and never committed. */

(() => {
"use strict";

const stage = document.getElementById("stage");
const DAY_MS = 86400000;

const ESV_ENDPOINT = "https://api.esv.org/v3/passage/text/";
const ESV_CREDIT = `Scripture quotations are from the ESV® Bible (The Holy Bible,
  English Standard Version®), © 2001 by Crossway, a publishing ministry of Good News
  Publishers. Used by permission. All rights reserved. <a href="https://www.esv.org"
  target="_blank" rel="noopener">esv.org</a>`;
const WEB_CREDIT = `Passages are from the World English Bible, which is public domain.
  Where it prints “Yahweh”, most Bibles print “the LORD” — it is the same name.`;

/* ---------------- storage ---------------- */

const store = {
  get(k, fallback){
    try{ const v = localStorage.getItem(k); return v === null ? fallback : v; }
    catch(e){ return fallback; }
  },
  set(k, v){ try{ localStorage.setItem(k, v); }catch(e){} },
  json(k, fallback){
    try{ return JSON.parse(localStorage.getItem(k)) ?? fallback; }
    catch(e){ return fallback; }
  }
};

const prefs = {
  name:  store.get("p.name", ""),
  scale: parseFloat(store.get("p.scale", "1")) || 1,
  theme: store.get("p.theme", "system"),
  bible: store.get("p.bible", "web")            /* "web" | "esv" */
};

function applyPrefs(){
  document.documentElement.style.setProperty("--scale", String(prefs.scale));
  if(prefs.theme === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = prefs.theme;

  /* keep the browser chrome in step with the chosen theme */
  const dark = prefs.theme === "dark" ||
    (prefs.theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.remove());
  const m = document.createElement("meta");
  m.name = "theme-color";
  m.content = dark ? "#131520" : "#E9EBEF";
  document.head.appendChild(m);
}

/* ---------------- passage registry ---------------- */

/* Every passage in the app gets a stable key so it can be saved from any view. */
const registry = new Map();
function key(ref, s){
  return (ref + "|" + s).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 64);
}
function enrol(p){
  const k = key(p.ref, p.s);
  if(!registry.has(k)) registry.set(k, {k, ref:p.ref, s:p.s, spoken:!!p.spoken});
  return k;
}
DAYS.forEach(d => { d.key = enrol(d); });
VOICE.forEach(g => g.items.forEach(it => { it.key = enrol({...it, spoken:true}); }));
THEMES.forEach(t => t.items.forEach(it => { it.key = enrol(it); }));
MEMORY.forEach(m => { m.key = enrol(m); });

/* One sequence through everything, for the reader to cycle. The thirty come
   first — they are the curated spine, and they carry a title and a line of
   comment — then every other passage that is not already among them, each
   tagged with where in the app it otherwise lives. */
const ALL = [];
{
  const seen = new Set();
  const add = (p, extra) => {
    if(seen.has(p.key)) return;
    seen.add(p.key);
    ALL.push({...p, ...extra});
  };
  DAYS.forEach((d, i) => add(d, {day:i + 1}));
  VOICE.forEach(g => g.items.forEach(it =>
    add({...it, spoken:true}, {from:`In his own words · ${g.group}`})));
  THEMES.forEach(t => t.items.forEach(it => add(it, {from:`When… ${t.t}`})));
  MEMORY.forEach(m => add(m, {from:"Worth memorizing"}));
}

let saved = new Set(store.json("p.saved", []));
const isSaved = k => saved.has(k);
function toggleSave(k){
  if(saved.has(k)){ saved.delete(k); toast("Removed"); }
  else { saved.add(k); toast("Saved"); }
  store.set("p.saved", JSON.stringify([...saved]));
}

/* ---------------- the ESV ---------------- */

const esv = {
  key(){ return store.get("p.esvKey", ""); },
  setKey(v){ store.set("p.esvKey", v); },
  on(){ return prefs.bible === "esv" && !!esv.key(); },

  cache: store.json("esv.cache", {}),
  saveCache(){ store.set("esv.cache", JSON.stringify(esv.cache)); },

  /* The data uses typographic dashes; the API wants plain ones. */
  query(ref){ return ref.replace(/[–—]/g, "-"); },

  pending: new Set(),
  /* refs whose fetch already failed this session, so a dead key or a flight-mode
     phone does not re-request them on every repaint */
  tried: new Set(),
  failed: false,

  /* Returns ESV text if it is already on the device, otherwise null. */
  text(ref){ return esv.on() ? (esv.cache[ref] || null) : null; },

  async fetchOne(ref){
    if(esv.cache[ref] || esv.pending.has(ref)) return false;
    esv.pending.add(ref);
    esv.tried.add(ref);
    try{
      const url = ESV_ENDPOINT + "?" + new URLSearchParams({
        q: esv.query(ref),
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
      });
      const res = await fetch(url, {headers:{Authorization: "Token " + esv.key()}});
      if(res.status === 401){ esv.failed = "key"; return false; }
      if(!res.ok){ esv.failed = "http"; return false; }
      const data = await res.json();
      const joined = (data.passages || [])
        .map(p => p.replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(" … ");
      if(!joined){ return false; }
      esv.cache[ref] = joined;
      esv.saveCache();
      esv.failed = false;
      return true;
    }catch(e){
      esv.failed = "network";
      return false;
    }finally{
      esv.pending.delete(ref);
    }
  },

  /* Fetch what the current view needs, a few at a time, then repaint once.
     Repaint only on a real change: repainting after a failure would call
     straight back into fill() and spin. */
  async fill(refs){
    if(!esv.on()) return;
    const missing = [...new Set(refs)].filter(r =>
      !esv.cache[r] && !esv.pending.has(r) && !esv.tried.has(r));
    if(!missing.length) return;
    let changed = false;
    for(let i = 0; i < missing.length; i += 4){
      const batch = missing.slice(i, i + 4);
      const got = await Promise.all(batch.map(r => esv.fetchOne(r)));
      changed = changed || got.some(Boolean);
      if(esv.failed === "key") break;
    }
    if(changed) paint(false);
  },

  /* Everything, for reading later with no signal. */
  async fillAll(onProgress){
    const all = [...new Set([...registry.values()].map(p => p.ref))];
    const missing = all.filter(r => !esv.cache[r]);
    let done = 0;
    for(let i = 0; i < missing.length; i += 4){
      const batch = missing.slice(i, i + 4);
      await Promise.all(batch.map(r => esv.fetchOne(r)));
      done += batch.length;
      onProgress(Math.min(done, missing.length), missing.length);
      if(esv.failed === "key") return false;
    }
    paint(false);
    return true;
  },

  cachedCount(){
    const all = new Set([...registry.values()].map(p => p.ref));
    return [...all].filter(r => esv.cache[r]).length;
  },
  totalCount(){ return new Set([...registry.values()].map(p => p.ref)).size; }
};

/* ---------------- helpers ---------------- */

const esc = s => String(s).replace(/[&<>"]/g, c =>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const body = s => esc(s).replace(/…/g, '<span class="ell">…</span>');

const icon = (id, cls) => `<svg class="${cls || ""}" aria-hidden="true"><use href="#${id}"/></svg>`;

/* Which translations the view being built actually put on screen. The credit
   has to name the text the reader is looking at, not the one they asked for:
   with the ESV selected but a passage not yet fetched, what shows is the WEB. */
let usedEsv = false, usedWeb = false;

/* The text to show for a passage, and whether it is still the fallback. */
function textFor(p){
  const e = esv.text(p.ref);
  if(e){ usedEsv = true; return {s:e, esv:true}; }
  usedWeb = true;
  return {s:p.s, esv:false};
}

function saveBtn(k){
  const on = isSaved(k);
  return `<button class="icon-btn" data-save="${k}" aria-pressed="${on}"
    aria-label="${on ? "Remove from saved" : "Save this passage"}"
    style="color:${on ? "var(--rubric)" : "var(--ink-faint)"}">
    ${icon(on ? "i-bookmark-fill" : "i-bookmark")}</button>`;
}

/* One passage, one card. */
function card(p, opts = {}){
  const t = textFor(p);
  const waiting = esv.on() && !t.esv;
  return `
  <article class="card${waiting ? " pending" : ""}">
    <div class="card-head">
      ${opts.num ? `<span class="card-num">${esc(opts.num)}</span>` : ""}
      <span class="card-ref">${esc(p.ref)}</span>
      ${opts.tag ? `<span class="card-tag">${esc(opts.tag)}</span>` : ""}
      ${saveBtn(p.key || opts.k)}
    </div>
    <p class="card-text${p.spoken ? " spoken" : ""}">${body(t.s)}${p.spoken ? "”" : ""}</p>
    ${opts.note ? `<p class="card-note">${esc(opts.note)}</p>` : ""}
  </article>`;
}

/* Called last in each view, once every card above it has resolved its text. */
function credit(){
  const parts = [];
  if(usedWeb || (!usedWeb && !usedEsv)) parts.push(WEB_CREDIT);
  if(usedEsv) parts.push(ESV_CREDIT);
  return `<p class="credit">${parts.join("<br><br>")}</p>`;
}

let toastTimer;
function toast(msg){
  document.querySelectorAll(".toast").forEach(t => t.remove());
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = msg;
  document.body.appendChild(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 2200);
}

async function share(k){
  const p = registry.get(k);
  if(!p) return;
  const t = textFor(p);
  const text = `“${t.s}”\n— ${p.ref} (${t.esv ? "ESV" : "WEB"})`;
  try{
    if(navigator.share){ await navigator.share({text}); return; }
    await navigator.clipboard.writeText(text);
    toast("Copied");
  }catch(e){
    if(e && e.name === "AbortError") return;   /* the person closed the share sheet */
    toast("Couldn’t share — copy it from the page instead");
  }
}

/* ---------------- which day is it ---------------- */

function todayStamp(){
  const d = new Date();
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY_MS);
}
/* Today's passage is one of the thirty, picked by the calendar from the day the
   app was first opened. It is a highlight now, not a gate: the reader is free
   to move through the whole collection. */
function autoIndex(){
  const now = todayStamp();
  let start = parseInt(store.get("p.start", ""), 10);
  if(!Number.isFinite(start)){ start = now; store.set("p.start", String(start)); }
  return (((now - start) % DAYS.length) + DAYS.length) % DAYS.length;
}

/* ---------------- state ---------------- */

/* home-screen shortcuts arrive as ?v=read / ?v=saved ("today" still works,
   from shortcuts pinned before the reader was renamed) */
const wanted = (new URLSearchParams(location.search).get("v") || "").replace("today", "read");
let view = ["read", "all", "voice", "theme", "saved"].includes(wanted) ? wanted : "read";
let idx = autoIndex();
let readTab = "thirty";

/* the reader wraps rather than stopping at either end */
function step(n){
  idx = ((idx + n) % ALL.length + ALL.length) % ALL.length;
  paint(false);
}

/* ---------------- views ---------------- */
/* each returns [html, refs it needs] */

function viewRead(){
  const p = ALL[idx];
  const auto = autoIndex();
  const isToday = idx === auto;
  const t = textFor(p);
  const aloud = p.aloud && prefs.name
    ? `<div class="aloud">
         <span class="rubric">Say it aloud</span>
         <p>“${body(p.aloud.replace("{name}", prefs.name))}”</p>
       </div>` : "";

  const html = `
  ${installBanner()}
  <article class="spread fade">
    <div class="margin">
      ${isToday ? '<span class="rubric">Today’s</span>' : ""}
      <span class="cite">${esc(p.ref)} · ${t.esv ? "ESV" : "WEB"}</span>
      ${p.spoken ? '<span class="cite quiet">God speaking</span>' : ""}
      <span class="cite tally">${idx + 1} of ${ALL.length}${
        p.day ? ` · Day ${p.day}` : p.from ? ` · ${esc(p.from)}` : ""}</span>
    </div>
    <div class="column">
      <p class="scripture${p.spoken ? " spoken" : ""}">${body(t.s)}${p.spoken ? "”" : ""}</p>
      ${p.t ? `<p class="title">${esc(p.t)}</p>` : ""}
      ${aloud}
      ${p.g ? `<p class="gloss">${body(p.g)}</p>` : ""}

      <div class="controls">
        <span class="stepper">
          <button data-step="-1" aria-label="Previous passage">${icon("i-left")}</button>
          <button data-step="1" aria-label="Next passage">${icon("i-right")}</button>
        </span>
        <button class="pill" data-shuffle aria-label="Jump to a random passage">
          ${icon("i-shuffle")}</button>
        ${isToday ? "" : '<button class="linkbtn" data-today>Today’s</button>'}
        <span class="spacer"></span>
        <button class="pill${isSaved(p.key) ? " on" : ""}" data-save="${p.key}">
          ${icon(isSaved(p.key) ? "i-bookmark-fill" : "i-bookmark")}${isSaved(p.key) ? "Saved" : "Save"}</button>
        <button class="pill" data-share="${p.key}" aria-label="Share">${icon("i-share")}</button>
      </div>
      ${credit()}
    </div>
  </article>`;
  /* prefetch the neighbours so stepping through does not stall on the network */
  const near = [p.ref, ALL[(idx + 1) % ALL.length].ref,
                ALL[(idx - 1 + ALL.length) % ALL.length].ref];
  return [html, near];
}

function viewAll(){
  const thirty = `
    <div class="index">
      ${DAYS.map((d, i) => `
        <button data-goto="${i}">
          <span class="n">${String(i + 1).padStart(2, "0")}</span>
          <span class="t">${esc(d.t)}<small>${esc(d.ref)}</small></span>
          <span class="flag">${isSaved(d.key) ? "●" : ""}</span>
        </button>`).join("")}
    </div>`;

  const memorize = `
    <div class="stack">
      ${MEMORY.map((m, i) => card(m, {num:String(i + 1).padStart(2, "0")})).join("")}
    </div>
    <div class="method">
      <ol>${MEMORY_METHOD.map(([b, rest]) =>
        `<li><span><b>${esc(b)}</b> ${esc(rest)}</span></li>`).join("")}</ol>
    </div>
    ${credit()}`;

  const html = `
  <div class="fade">
    <h2 class="head">${readTab === "thirty" ? "The thirty" : "Twelve to memorize"}</h2>
    <p class="standfirst">${readTab === "thirty"
      ? "One a day for a month, then start again. Nothing here expires."
      : "Short enough to memorize, load-bearing enough to be worth it. One a month gets you all twelve inside a year."}</p>
    <div class="segmented" role="tablist" aria-label="Reading">
      <button role="tab" data-read="thirty" aria-selected="${readTab === "thirty"}">The thirty</button>
      <button role="tab" data-read="memorize" aria-selected="${readTab === "memorize"}">Memorize</button>
    </div>
    ${readTab === "thirty" ? thirty : memorize}
  </div>`;
  return [html, readTab === "memorize" ? MEMORY.map(m => m.ref) : []];
}

function viewVoice(){
  const html = `
  <div class="fade">
    <h2 class="head">In his own words</h2>
    <p class="standfirst">The passages where God speaks of his love himself — <em>I have loved
    you</em>, <em>I will not forget you</em>, <em>I will carry you</em>. Read these aloud.
    Something in them is meant to be heard rather than scanned.</p>
    ${VOICE.map(g => `
      <section class="group">
        <span class="rubric">${esc(g.group)}</span>
        <div class="stack">
          ${g.items.map(it => card({...it, spoken:true}, {note:it.note})).join("")}
        </div>
      </section>`).join("")}
    <p class="gloss" style="border-top:0;padding-top:0;margin-top:0">Read one aloud. Then read it
    again with your own name in it where the text allows${prefs.name
      ? ` — <em>I have loved you, ${esc(prefs.name)}, with an everlasting love.</em>`
      : " — you can set your name in settings and the app will offer that reading."}
    Not because the promise is about you alone, but because it is not about you any less than
    anyone else. It was made to a people, and you are in it.</p>
    ${credit()}
  </div>`;
  return [html, VOICE.flatMap(g => g.items.map(it => it.ref))];
}

function viewTheme(){
  const html = `
  <div class="fade">
    <h2 class="head">When…</h2>
    <p class="standfirst">For the days when the reading isn’t what you need. Find the line that
    matches where you actually are, and read there instead.</p>
    ${THEMES.map(th => `
      <section class="group">
        <span class="rubric">${esc(th.t)}</span>
        <div class="stack">${th.items.map(it => card(it)).join("")}</div>
        <p class="also">Also: ${esc(th.also)}</p>
      </section>`).join("")}
    ${credit()}
  </div>`;
  return [html, THEMES.flatMap(t => t.items.map(it => it.ref))];
}

function viewSaved(){
  const items = [...saved].map(k => registry.get(k)).filter(Boolean);
  if(!items.length){
    return [`<div class="fade">
      <h2 class="head">Saved</h2>
      <div class="empty">
        ${icon("i-bookmark")}
        Nothing saved yet. Tap the bookmark on any passage and it will wait for you here.
      </div>
    </div>`, []];
  }
  const html = `
  <div class="fade">
    <h2 class="head">Saved</h2>
    <p class="standfirst">${items.length} passage${items.length === 1 ? "" : "s"} you kept.
    They stay on this device.</p>
    <div class="stack">${items.map(p => card(p, {k:p.k})).join("")}</div>
    ${credit()}
  </div>`;
  return [html, items.map(p => p.ref)];
}

const VIEWS = {read:viewRead, all:viewAll, voice:viewVoice, theme:viewTheme, saved:viewSaved};

function paint(scroll){
  usedEsv = usedWeb = false;
  const [html, refs] = VIEWS[view]();
  stage.innerHTML = html;
  document.querySelectorAll("nav.tabs button").forEach(b =>
    b.setAttribute("aria-selected", String(b.dataset.view === view)));
  if(scroll) window.scrollTo(0, 0);
  if(esv.on() && refs.length) esv.fill(refs);
}

/* ---------------- install prompt ---------------- */

let deferredInstall = null;
const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function installBanner(){
  if(isStandalone() || store.get("p.installDismissed") === "1") return "";
  if(deferredInstall){
    return `<div class="install">
      <span style="flex:1">Keep this on your home screen so it opens like any other app —
      and works with no signal.</span>
      <button class="pill" data-install>Install</button>
      <button class="dismiss" data-dismiss-install aria-label="Dismiss">&times;</button>
    </div>`;
  }
  if(isIOS()){
    return `<div class="install">
      <span style="flex:1">To keep this on your home screen: tap
      <b>Share</b>, then <b>Add to Home Screen</b>. It will work with no signal.</span>
      <button class="dismiss" data-dismiss-install aria-label="Dismiss">&times;</button>
    </div>`;
  }
  return "";
}

window.addEventListener("beforeinstallprompt", e => {
  e.preventDefault();
  deferredInstall = e;
  if(view === "read") paint(false);
});
window.addEventListener("appinstalled", () => {
  deferredInstall = null;
  if(view === "read") paint(false);
});

/* ---------------- settings sheet ---------------- */

function esvStatus(){
  if(!esv.key()) return `<p class="status">No key yet, so the app stays on the World English
    Bible. A key is free for personal use.</p>`;
  if(esv.failed === "key") return `<p class="status bad">That key was not accepted. Check it
    on api.esv.org and paste it again.</p>`;
  if(esv.failed === "network") return `<p class="status bad">Couldn’t reach the ESV API. Passages
    already downloaded still work; the rest show the World English Bible.</p>`;
  return `<p class="status">${esv.cachedCount()} of ${esv.totalCount()} passages downloaded and
    available offline.</p>`;
}

function openSettings(){
  const wrap = document.createElement("div");
  wrap.className = "sheet-scrim";
  wrap.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Settings">
      <h2>Settings</h2>

      <div class="field">
        <label>Translation</label>
        <div class="choices" id="s-bible">
          <button data-bible="web" aria-pressed="${prefs.bible === "web"}">World English</button>
          <button data-bible="esv" aria-pressed="${prefs.bible === "esv"}">ESV</button>
        </div>
        <p class="help">The World English Bible is public domain, so it ships inside the app and
        works offline straight away. The ESV is licensed: Crossway lets it be read through their
        own API using a key that belongs to you, so the app fetches it as you read rather than
        carrying a copy.</p>
      </div>

      <div class="field" id="s-esv-field"${prefs.bible === "esv" ? "" : " hidden"}>
        <label for="s-esvkey">Your ESV API key</label>
        <p class="help">Free for personal use from
        <a href="https://api.esv.org/" target="_blank" rel="noopener">api.esv.org</a> — create an
        account, add an application, and copy the key it gives you. It is stored only on this
        device and sent only to Crossway.</p>
        <input type="password" id="s-esvkey" value="${esc(esv.key())}"
               placeholder="Paste your key" autocomplete="off" spellcheck="false">
        <div id="s-esv-status">${esvStatus()}</div>
        <div class="choices" style="margin-top:.6rem">
          <button data-esv-fetch>Download all for offline</button>
        </div>
      </div>

      <div class="field">
        <label for="s-name">Your name</label>
        <p class="help">Optional. Where a passage allows it, the app will offer a way to read it
        aloud with your name in it — as a reading aid, shown beside the passage. The scripture
        itself is never altered.</p>
        <input type="text" id="s-name" value="${esc(prefs.name)}" placeholder="Leave blank to skip"
               autocomplete="given-name" enterkeyhint="done">
      </div>

      <div class="field">
        <label>Text size</label>
        <div class="choices" id="s-scale">
          ${[["0.9","Small"],["1","Normal"],["1.15","Large"],["1.32","Largest"]].map(([v, l]) =>
            `<button data-scale="${v}" aria-pressed="${Math.abs(prefs.scale - parseFloat(v)) < 0.01}">${l}</button>`
          ).join("")}
        </div>
      </div>

      <div class="field">
        <label>Appearance</label>
        <div class="choices" id="s-theme">
          ${[["system","Match device"],["light","Light"],["dark","Dark"]].map(([v, l]) =>
            `<button data-theme="${v}" aria-pressed="${prefs.theme === v}">${l}</button>`
          ).join("")}
        </div>
      </div>

      <button class="close" data-close-sheet>Done</button>

      <p class="note-block"><b>On the red.</b> Numbers, references and labels are set in red the
      way headings were inked in old psalters; the scripture itself stays in black. A red quotation
      mark marks the passages where God speaks in the first person.<br><br>
      <b>On your data.</b> Everything you save and set — your key included — stays on this device.
      There is no account and no tracking.<br><br>
      <b>On the text.</b> ${WEB_CREDIT}<br><br>${ESV_CREDIT}</p>
    </div>`;

  const refreshStatus = () => {
    const el = wrap.querySelector("#s-esv-status");
    if(el) el.innerHTML = esvStatus();
  };

  const close = () => {
    const n = wrap.querySelector("#s-name").value.trim().slice(0, 40);
    if(n !== prefs.name){ prefs.name = n; store.set("p.name", n); }
    const k = wrap.querySelector("#s-esvkey").value.trim();
    if(k !== esv.key()){ esv.setKey(k); esv.failed = false; esv.tried.clear(); }
    wrap.remove();
    document.removeEventListener("keydown", onKey);
    paint(false);
  };
  const onKey = e => { if(e.key === "Escape") close(); };

  wrap.addEventListener("click", async e => {
    if(e.target === wrap || e.target.closest("[data-close-sheet]")) return close();

    const bi = e.target.closest("[data-bible]");
    if(bi){
      prefs.bible = bi.dataset.bible;
      store.set("p.bible", prefs.bible);
      wrap.querySelectorAll("#s-bible button").forEach(b =>
        b.setAttribute("aria-pressed", String(b === bi)));
      wrap.querySelector("#s-esv-field").hidden = prefs.bible !== "esv";
      refreshStatus();
      return;
    }

    if(e.target.closest("[data-esv-fetch]")){
      const k = wrap.querySelector("#s-esvkey").value.trim();
      if(k !== esv.key()){ esv.setKey(k); esv.failed = false; esv.tried.clear(); }
      if(!esv.key()){ toast("Paste your ESV key first"); return; }
      const btn = e.target.closest("[data-esv-fetch]");
      btn.disabled = true;
      const ok = await esv.fillAll((done, total) => { btn.textContent = `${done} / ${total}…`; });
      btn.disabled = false;
      btn.textContent = "Download all for offline";
      refreshStatus();
      toast(ok ? "Downloaded" : "Couldn’t finish — check the key");
      return;
    }

    const sc = e.target.closest("[data-scale]");
    if(sc){
      prefs.scale = parseFloat(sc.dataset.scale);
      store.set("p.scale", String(prefs.scale));
      applyPrefs();
      wrap.querySelectorAll("#s-scale button").forEach(b =>
        b.setAttribute("aria-pressed", String(b === sc)));
      return;
    }
    const th = e.target.closest("[data-theme]");
    if(th){
      prefs.theme = th.dataset.theme;
      store.set("p.theme", prefs.theme);
      applyPrefs();
      wrap.querySelectorAll("#s-theme button").forEach(b =>
        b.setAttribute("aria-pressed", String(b === th)));
    }
  });

  document.addEventListener("keydown", onKey);
  document.body.appendChild(wrap);
}

/* ---------------- events ---------------- */

document.addEventListener("click", e => {
  const tab = e.target.closest("nav.tabs button");
  if(tab){ view = tab.dataset.view; paint(true); return; }

  if(e.target.closest("#settings-btn")){ openSettings(); return; }

  const seg = e.target.closest("[data-read]");
  if(seg){ readTab = seg.dataset.read; paint(true); return; }

  const stepBtn = e.target.closest("[data-step]");
  if(stepBtn){ step(Number(stepBtn.dataset.step)); return; }

  if(e.target.closest("[data-shuffle]")){
    let n = idx;
    while(n === idx && ALL.length > 1) n = Math.floor(Math.random() * ALL.length);
    idx = n; paint(false); return;
  }
  if(e.target.closest("[data-today]")){ idx = autoIndex(); paint(false); return; }

  const goto = e.target.closest("[data-goto]");
  if(goto){ idx = Number(goto.dataset.goto); view = "read"; paint(true); return; }

  const sv = e.target.closest("[data-save]");
  if(sv){ toggleSave(sv.dataset.save); paint(false); return; }

  const sh = e.target.closest("[data-share]");
  if(sh){ share(sh.dataset.share); return; }

  if(e.target.closest("[data-install]") && deferredInstall){
    deferredInstall.prompt();
    deferredInstall.userChoice.finally(() => { deferredInstall = null; paint(false); });
    return;
  }
  if(e.target.closest("[data-dismiss-install]")){
    store.set("p.installDismissed", "1"); paint(false);
  }
});

document.addEventListener("keydown", e => {
  if(view !== "read" || e.metaKey || e.ctrlKey || e.altKey) return;
  if(e.target.matches("input, textarea")) return;
  if(e.key === "ArrowLeft") step(-1);
  if(e.key === "ArrowRight") step(1);
});

/* swipe sideways to move through the collection on a phone */
let touchX = 0, touchY = 0;
stage.addEventListener("touchstart", e => {
  if(e.touches.length !== 1) return;
  touchX = e.touches[0].clientX; touchY = e.touches[0].clientY;
}, {passive:true});
stage.addEventListener("touchend", e => {
  if(view !== "read" || !e.changedTouches.length) return;
  const dx = e.changedTouches[0].clientX - touchX;
  const dy = e.changedTouches[0].clientY - touchY;
  /* clearly horizontal, so a scroll is never mistaken for a swipe */
  if(Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.8) step(dx < 0 ? 1 : -1);
}, {passive:true});

/* A phone left open overnight lands on the new day's passage when picked up,
   but only if it was still sitting on yesterday's. */
let shownFor = autoIndex();
document.addEventListener("visibilitychange", () => {
  if(document.visibilityState !== "visible" || view !== "read") return;
  const auto = autoIndex();
  if(auto !== shownFor && idx === shownFor){ idx = auto; paint(false); }
  shownFor = auto;
});

/* ---------------- go ---------------- */

applyPrefs();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyPrefs);
paint(false);

if("serviceWorker" in navigator){
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

})();
