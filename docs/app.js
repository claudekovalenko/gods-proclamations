/* Proclamations — app shell.
   No framework, no build step: the whole app is these three files plus data.js. */

(() => {
"use strict";

const stage = document.getElementById("stage");
const DAY_MS = 86400000;

/* ---------------- preferences ---------------- */

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
  theme: store.get("p.theme", "system")
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

let saved = new Set(store.json("p.saved", []));
function isSaved(k){ return saved.has(k); }
function toggleSave(k){
  if(saved.has(k)){ saved.delete(k); toast("Removed"); }
  else { saved.add(k); toast("Saved"); }
  store.set("p.saved", JSON.stringify([...saved]));
}

/* ---------------- helpers ---------------- */

const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const body = s => esc(s).replace(/…/g, '<span class="ell">…</span>');

function icon(id, cls){ return `<svg class="${cls || ""}" aria-hidden="true"><use href="#${id}"/></svg>`; }

function saveBtn(k){
  const on = isSaved(k);
  return `<button class="icon-btn" data-save="${k}" aria-pressed="${on}"
           aria-label="${on ? "Remove from saved" : "Save this passage"}"
           style="color:${on ? "var(--rubric)" : "var(--ink-faint)"};width:2rem;height:2rem">
           ${icon(on ? "i-bookmark-fill" : "i-bookmark")}</button>`;
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
  toastTimer = setTimeout(() => el.remove(), 1900);
}

async function share(k){
  const p = registry.get(k);
  if(!p) return;
  const text = `“${p.s}”\n— ${p.ref} (WEB)`;
  try{
    if(navigator.share){ await navigator.share({text}); return; }
    await navigator.clipboard.writeText(text);
    toast("Copied");
  }catch(e){
    if(e && e.name === "AbortError") return;      /* the person closed the share sheet */
    toast("Couldn’t share — copy it from the page instead");
  }
}

/* ---------------- which day is it ---------------- */

function todayStamp(){
  const d = new Date();
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / DAY_MS);
}
/* Day 1 is the first day the app is opened; it advances with the calendar and
   wraps round at thirty. */
function autoIndex(){
  const now = todayStamp();
  let start = parseInt(store.get("p.start", ""), 10);
  if(!Number.isFinite(start)){ start = now; store.set("p.start", String(start)); }
  return (((now - start) % DAYS.length) + DAYS.length) % DAYS.length;
}

/* ---------------- state ---------------- */

/* home-screen shortcuts arrive as ?v=today / ?v=saved */
const wanted = new URLSearchParams(location.search).get("v");
let view = ["today", "all", "voice", "theme", "saved"].includes(wanted) ? wanted : "today";
let dayIdx = autoIndex();
let readTab = "thirty";

/* ---------------- views ---------------- */

function passageMarkup(p, cls){
  return `<p class="${cls}${p.spoken ? " spoken" : ""}">${body(p.s)}${p.spoken ? "”" : ""}</p>`;
}

function viewToday(){
  const d = DAYS[dayIdx];
  const auto = autoIndex();
  const aloud = d.aloud && prefs.name
    ? `<div class="aloud">
         <div class="rubric">Say it aloud</div>
         <p>“${body(d.aloud.replace("{name}", prefs.name))}”</p>
       </div>` : "";

  return `
  ${installBanner()}
  <article class="spread fade">
    <div class="margin">
      <div class="rubric">Day ${dayIdx + 1} of ${DAYS.length}</div>
      <div class="cite">${esc(d.ref)}</div>
      ${d.spoken ? '<div class="cite quiet">God speaking</div>' : ""}
    </div>
    <div class="column">
      ${passageMarkup(d, "scripture")}
      <p class="title">${esc(d.t)}</p>
      ${aloud}
      <p class="gloss">${body(d.g)}</p>

      <div class="controls">
        <button class="pill" data-step="-1" ${dayIdx === 0 ? "disabled" : ""}>
          ${icon("i-left")}Back</button>
        <button class="pill" data-step="1" ${dayIdx === DAYS.length - 1 ? "disabled" : ""}>
          Next${icon("i-right")}</button>
        <span class="spacer"></span>
        <button class="pill${isSaved(d.key) ? " on" : ""}" data-save="${d.key}">
          ${icon(isSaved(d.key) ? "i-bookmark-fill" : "i-bookmark")}${isSaved(d.key) ? "Saved" : "Save"}</button>
        <button class="pill" data-share="${d.key}">${icon("i-share")}Share</button>
      </div>
      ${dayIdx !== auto ? '<button class="linkbtn" data-today>← Back to today’s</button>' : ""}
    </div>
  </article>`;
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
    ${MEMORY.map((m, i) => `
      <div class="entry">
        <div class="margin">
          <div class="rubric">${String(i + 1).padStart(2, "0")}</div>
          <div class="cite">${esc(m.ref)}</div>
        </div>
        <div class="body">
          <blockquote>${body(m.s)}</blockquote>
          <div style="margin-top:.5rem">${saveBtn(m.key)}</div>
        </div>
      </div>`).join("")}
    <div class="spread">
      <div class="margin"><div class="rubric">Method</div></div>
      <div class="column">
        <div class="method">
          <ol>${MEMORY_METHOD.map(([b, rest]) =>
            `<li><span><b>${esc(b)}</b> ${esc(rest)}</span></li>`).join("")}</ol>
        </div>
      </div>
    </div>`;

  return `
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
}

function viewVoice(){
  return `
  <div class="fade">
    <h2 class="head">In his own words</h2>
    <p class="standfirst">The passages where God speaks of his love himself — <em>I have loved
    you</em>, <em>I will not forget you</em>, <em>I will carry you</em>. Read these aloud.
    Something in them is meant to be heard rather than scanned.</p>
    ${VOICE.map(g => g.items.map((it, i) => `
      <div class="entry">
        <div class="margin">
          ${i === 0 ? `<div class="rubric">${esc(g.group)}</div>` : ""}
          <div class="cite">${esc(it.ref)}</div>
        </div>
        <div class="body">
          <blockquote class="spoken">${body(it.s)}”</blockquote>
          ${it.note ? `<p class="note">${esc(it.note)}</p>` : ""}
          <div style="margin-top:.5rem">${saveBtn(it.key)}</div>
        </div>
      </div>`).join("")).join("")}
    <div class="spread" style="margin-top:2.4rem">
      <div class="margin"><div class="rubric">A way in</div></div>
      <div class="column">
        <p class="gloss" style="border-top:0;padding-top:0;margin-top:0">Read one aloud. Then read
        it again with your own name in it where the text allows${prefs.name
          ? ` — <em>I have loved you, ${esc(prefs.name)}, with an everlasting love.</em>`
          : " — you can set your name in settings and the app will offer that reading."}
        Not because the promise is about you alone, but because it is not about you any less than
        anyone else. It was made to a people, and you are in it.</p>
      </div>
    </div>
  </div>`;
}

function viewTheme(){
  return `
  <div class="fade">
    <h2 class="head">When…</h2>
    <p class="standfirst">For the days when the reading isn’t what you need. Find the line that
    matches where you actually are, and read there instead.</p>
    ${THEMES.map(th => `
      <div class="entry">
        <div class="margin"><div class="rubric">${esc(th.t)}</div></div>
        <div class="body">
          ${th.items.map(it => `
            <blockquote style="margin-bottom:.5rem">${body(it.s)}</blockquote>
            <p class="note" style="margin:0 0 .35rem">${esc(it.ref)}</p>
            <div style="margin:0 0 1.5rem">${saveBtn(it.key)}</div>`).join("")}
          <p class="also">Also: ${esc(th.also)}</p>
        </div>
      </div>`).join("")}
  </div>`;
}

function viewSaved(){
  const items = [...saved].map(k => registry.get(k)).filter(Boolean);
  if(!items.length){
    return `<div class="fade">
      <h2 class="head">Saved</h2>
      <div class="empty">
        ${icon("i-bookmark")}
        Nothing saved yet. Tap the bookmark on any passage and it will wait for you here.
      </div>
    </div>`;
  }
  return `
  <div class="fade">
    <h2 class="head">Saved</h2>
    <p class="standfirst">${items.length} passage${items.length === 1 ? "" : "s"} you kept.
    They stay on this device.</p>
    ${items.map(p => `
      <div class="entry">
        <div class="margin"><div class="cite">${esc(p.ref)}</div></div>
        <div class="body">
          <blockquote${p.spoken ? ' class="spoken"' : ""}>${body(p.s)}${p.spoken ? "”" : ""}</blockquote>
          <div class="controls" style="margin-top:.9rem;padding-top:.9rem">
            <button class="pill on" data-save="${p.k}">${icon("i-bookmark-fill")}Saved</button>
            <button class="pill" data-share="${p.k}">${icon("i-share")}Share</button>
          </div>
        </div>
      </div>`).join("")}
  </div>`;
}

const VIEWS = {today:viewToday, all:viewAll, voice:viewVoice, theme:viewTheme, saved:viewSaved};

function paint(scroll){
  stage.innerHTML = VIEWS[view]();
  document.querySelectorAll("nav.tabs button").forEach(b =>
    b.setAttribute("aria-selected", String(b.dataset.view === view)));
  if(scroll) window.scrollTo(0, 0);
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
  if(view === "today") paint(false);
});
window.addEventListener("appinstalled", () => {
  deferredInstall = null;
  if(view === "today") paint(false);
});

/* ---------------- settings sheet ---------------- */

function openSettings(){
  const wrap = document.createElement("div");
  wrap.className = "sheet-scrim";
  wrap.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Settings">
      <h2>Settings</h2>

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

      <p class="note-block"><b>On the text.</b> Passages are from the World English Bible, which is
      public domain. Where it prints <b>Yahweh</b>, most Bibles print <b>the LORD</b> — it is the
      same name.<br><br>
      <b>On the red.</b> Numbers, references and labels are set in red the way headings were inked
      in old psalters; the scripture itself stays in black. A red quotation mark marks the passages
      where God speaks in the first person.<br><br>
      <b>On your data.</b> Everything you save and set stays on this device. Nothing is sent
      anywhere, and there is no account.</p>
    </div>`;

  const close = () => {
    const v = wrap.querySelector("#s-name").value.trim().slice(0, 40);
    if(v !== prefs.name){ prefs.name = v; store.set("p.name", v); }
    wrap.remove();
    document.removeEventListener("keydown", onKey);
    paint(false);
  };
  const onKey = e => { if(e.key === "Escape") close(); };

  wrap.addEventListener("click", e => {
    if(e.target === wrap || e.target.closest("[data-close-sheet]")) return close();

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
  wrap.querySelector("#s-name").focus({preventScroll:true});
}

/* ---------------- events ---------------- */

document.addEventListener("click", e => {
  const tab = e.target.closest("nav.tabs button");
  if(tab){ view = tab.dataset.view; paint(true); return; }

  if(e.target.closest("#settings-btn")){ openSettings(); return; }

  const seg = e.target.closest("[data-read]");
  if(seg){ readTab = seg.dataset.read; paint(true); return; }

  const step = e.target.closest("[data-step]");
  if(step){
    dayIdx = Math.min(DAYS.length - 1, Math.max(0, dayIdx + Number(step.dataset.step)));
    paint(false); return;
  }
  if(e.target.closest("[data-today]")){ dayIdx = autoIndex(); paint(false); return; }

  const goto = e.target.closest("[data-goto]");
  if(goto){ dayIdx = Number(goto.dataset.goto); view = "today"; paint(true); return; }

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
  if(view !== "today" || e.metaKey || e.ctrlKey || e.altKey) return;
  if(e.target.matches("input, textarea")) return;
  if(e.key === "ArrowLeft" && dayIdx > 0){ dayIdx--; paint(false); }
  if(e.key === "ArrowRight" && dayIdx < DAYS.length - 1){ dayIdx++; paint(false); }
});

/* A phone left open overnight should be showing the new day when it is picked up. */
document.addEventListener("visibilitychange", () => {
  if(document.visibilityState === "visible" && view === "today"){
    const auto = autoIndex();
    if(auto !== dayIdx){ dayIdx = auto; paint(false); }
  }
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
