# Morse Trainer BD 📻

A free, fully offline, bilingual (Bangla / English) Morse code trainer that
teaches Morse code by ear. No account, no server, no network requests — every
sound is synthesized on your device with the Web Audio API.

**Live demo:** https://fahad3235.github.io/morse-trainer-bd/

## Features

1. **Translator** — Live text ↔ Morse conversion (A–Z, 0–9, and 18 punctuation
   marks). Unknown characters become `?`; invalid Morse input shows a clear
   warning instead of guessing.
2. **Listen & Play** — Type any text and hear it as Morse beeps at an
   adjustable speed (5–40 WPM, standard PARIS timing: dot = 1 unit,
   dash = 3 units, 1200/WPM milliseconds per unit).
3. **Tap Key** — Practice keying yourself: hold the on-screen key (or the
   Space bar) — a quick tap is a dot, a long hold is a dash. Letters decode
   automatically after a short pause.
4. **Listen Quiz** — Hear a random letter or digit, pick it from four
   options. Score (+10 per correct answer), streak, and a persisted best
   score.
5. **Learn the Code** — A full chart of all 54 characters with a play button
   for each one, so you can hear every code before you quiz yourself.
6. **Bilingual UI** — English / বাংলা toggle (persisted), Bengali digits when
   Bangla is active, WPM and best score persisted in `localStorage`, and a
   390px mobile layout with no horizontal overflow.

## Stack

- Pure HTML, CSS, and JavaScript — no frameworks, no build step, no
  dependencies.
- Web Audio API for beep synthesis; `localStorage` for settings and scores.

## Run locally

```sh
# Any static server works, or just open the file:
python3 -m http.server 8000
# then open http://localhost:8000/
```

No install step and no environment variables are needed.

## Testing

```sh
# Unit tests for the pure logic (encode/decode, timing schedule,
# tap classification, quiz generation):
node tests/morse.test.js

# Headless-Chrome smoke tests over CDP (translator flows, language toggle,
# quiz flow, 390px layout, zero console errors):
node tests/smoke-cdp.mjs
```

The smoke test uses the Playwright `headless_shell` binary if present and
falls back to `CHROME_BIN` when set. Current results: 18/18 unit tests and
12/12 smoke checks pass, with zero console or page errors.

## Limitations

- Audio playback requires a user gesture (browser autoplay policy); press
  Play or Listen first.
- The tap key classifies presses with a fixed 250 ms dot/dash threshold.
- This is a learning tool, not a radio-licence trainer: it does not cover
  operating procedure, regulations, or on-air practice.
- The quiz covers letters A–Z and digits 0–9 only.

## Status

MVP complete. Ships with no user data — only language, WPM, and best-score
preferences are stored locally on the user's own device.
