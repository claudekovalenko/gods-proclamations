# God's Proclamations

What God says about his love — as an installable app, and as plain text you can
print.

## The app

**<https://claudekovalenko.github.io/gods-proclamations/>**

A small offline-first web app (a PWA). Open that link on your phone and add it
to your home screen; after that it opens like any other app and works with no
signal.

- **Today** — one passage a day, advancing on its own with the calendar and
  wrapping round at thirty. Save it, or share it.
- **Read** — all thirty in a list, plus twelve verses worth memorizing and a
  method for actually learning them.
- **His voice** — only the passages where God speaks of his love in the first
  person. These are the ones to read aloud.
- **When…** — verses grouped by what you're facing: fear, guilt, feeling
  forgotten, worn out, drifted.
- **Saved** — whatever you bookmarked.

Settings hold your name (optional — where a passage allows it the app offers a
way to read it aloud with your name in it, alongside the untouched text), text
size, and light or dark.

Everything you save and set stays on your device. There is no account, no
tracking, and nothing is sent anywhere.

### Installing

- **iPhone / iPad** — open the link in Safari, tap **Share**, then **Add to
  Home Screen**.
- **Android** — open in Chrome and tap **Install** on the banner, or use
  **⋮ → Add to Home screen**.
- **Desktop** — Chrome and Edge show an install button in the address bar.

## The text collection

The same passages as plain Markdown, for printing or reading in an editor.

| File | What it's for |
| --- | --- |
| [`gods-love/30-day-plan.md`](gods-love/30-day-plan.md) | One passage a day for a month, with a line to carry through the day |
| [`gods-love/in-his-own-words.md`](gods-love/in-his-own-words.md) | Only the passages where God speaks of his love in the first person |
| [`gods-love/by-theme.md`](gods-love/by-theme.md) | Verses grouped by what you're facing — fear, guilt, feeling forgotten, feeling far off |
| [`gods-love/memory-verses.md`](gods-love/memory-verses.md) | Twelve short verses worth knowing by heart |

## How to use it

Thirty days because a month is long enough to change how you think and short
enough to finish. But it isn't a schedule to fall behind on.

- **Morning, five minutes.** Read the passage twice — once to hear it, once
  slowly. Then read the one line under it and leave it alone.
- **Read it out loud.** Especially the first-person passages. Hearing "I have
  loved you with an everlasting love" spoken lands differently than scanning it.
- **Stay put when something catches.** If a verse won't let go of you, don't
  move on the next day. Sit in it for a week.
- **Go by theme on the hard days.** When the day's passage isn't what you need,
  find the line that matches where you actually are and read there instead.
- **Read it in context.** Every reference is given so you can open a Bible and
  read the paragraph around it. The verses here are doorways, not the room.

## A note on translation

Passages are quoted from the **World English Bible (WEB)**, a public-domain
modern-English translation, so this collection can be freely copied, printed,
and shared.

The WEB renders the covenant name of God as **"Yahweh"** where most English
Bibles print **"the LORD"** in small capitals. If that's unfamiliar, read "the
LORD" in its place — it's the same name.

If you have a translation you love, use it. These texts are a starting point,
not a replacement.

## Repository layout

```
docs/                 the app — this directory is what GitHub Pages serves
  index.html          shell and icon sprite
  app.css             styles, both themes
  app.js              views, state, settings, install prompt
  data.js             every passage in the app
  sw.js               service worker: offline shell + font cache
  manifest.webmanifest
  icons/              generated — see tools/make-icons.sh
gods-love/            the same passages as Markdown
tools/make-icons.sh   redraws the icons from the quotation-mark path
.github/workflows/pages.yml
```

No build step and no dependencies: the app is the files in `docs/`. To work on
it, serve that directory (`python3 -m http.server` from inside `docs/`) and
open it — a service worker needs `http://localhost`, not `file://`.

After changing anything in `docs/`, bump `SHELL` in `docs/sw.js` so existing
installs pick the new version up instead of serving the cached one.
