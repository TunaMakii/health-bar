# Health Bar

An installable **PWA** for tracking life, counters, and tokens in *Magic: The
Gathering* — one URL that works on iPad, Android phones/tablets, and desktop.
Dark-leather-and-gold "planeswalker" theme, fully offline once installed.

The complete design + behaviour spec is the interactive prototype at
[`mockups/healthbar-interactive.html`](mockups/healthbar-interactive.html); the
built app is a faithful port of it.

## Features

- **Game modes** — Normal (20) and Commander (40 + a commander-health bar per
  player), or a custom starting life.
- **Bars & counters** — life, commander health (0–21, independent of life),
  poison (10 = death), energy, extra health, custom counters, and token squads
  with P/T, ×count and ±1/+1 counters. ~70 known MTG tokens plus custom.
- **Colour identity** — any free WUBRG combination or colorless; all five =
  Rainbow. Drives the card frame, bar fill, and swatch.
- **Battlefield** — adaptive single-player view: a framed board + player rail on
  tablets/landscape, an edge-to-edge full-bleed board with floating pills on
  phones, and a scaled-up solo mode on any device.
- **Turns** — swipe left/right to pass the turn (round counting, skips the dead),
  with three selectable transition animations (Draw Slide, Planeswalk, Combat
  Slash).
- **Tools** — d20 roll-off, seat swapping, reset duel / new game, add player
  mid-game, synthesized sound + haptics (mutable).
- **PWA** — installable, full offline play, auto-update toast, screen wake-lock
  during a game. State is persisted to `localStorage` on every change, so a
  refresh mid-game loses nothing.

## Stack

Vite + TypeScript, no UI framework (vanilla TS view modules), no backend, no
runtime dependencies. Fonts (Cinzel Decorative / Cinzel / EB Garamond) are
self-hosted via `@fontsource` for offline use.

## Develop

```bash
npm install
npm run dev        # local dev server
npm run test       # vitest — model + jsdom smoke tests
npm run typecheck  # tsc --noEmit
npm run build      # tsc + vite build → dist/
npm run preview    # serve the production build
```

## Deploy

### GitHub Pages
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and deploys
`dist/` on every push to `main`. For a **project site** the app is served at:

```
https://<your-username>.github.io/<repo-name>/
```

The workflow sets Vite's `base` to `/<repo-name>/` automatically. For a
**user/organisation site** or a **custom domain**, change `BASE_PATH` in the
workflow to `"/"`. (Enable Pages → "GitHub Actions" in the repo settings once.)

### Netlify
[`netlify.toml`](netlify.toml) is included as an alternative — it serves at the
site root, so no base path is needed.

## Project layout

```
src/
  state/          pure, tested game model (no DOM)
    model.ts      lifecycle, death/revive, turns, token math
    tokens.ts     the ~70-token catalogue
    types.ts      Player / Bar / GameState
    persistence.ts  localStorage
    store.ts      the live singleton
  ui/
    manaSymbols.ts  ⚠ isolated WotC IP (mana symbols + palette)
    colors.ts       colour-identity gradients
    app.ts          screens, handlers, gestures (the controller)
    animations.ts   turn transitions
    sound.ts        WebAudio synth + haptics
    wakelock.ts     screen wake-lock
    dialog.ts       themed input dialog
  style.css       design system (ported from the prototype)
test/             vitest suites
public/           icons, favicon.svg (master), splash
```

## IP note

The mana symbols, token names, and "Magic: The Gathering" are property of
Wizards of the Coast — fine for personal use. All WotC-derived assets are
isolated in [`src/ui/manaSymbols.ts`](src/ui/manaSymbols.ts) and the app icons
derive from [`public/favicon.svg`](public/favicon.svg), so they can be swapped
before any public release.
