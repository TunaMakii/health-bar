# Health Bar — Claude Code Prompt Package (Web / PWA build)

An MTG life, counter, and token tracker. Installable web app (PWA): one URL that works on
iPad, Android phones/tablets, and desktop. This package is a sequence of prompts to paste
into Claude Code **in order**, each building on the last. Run one, review the result, then
run the next.

**Reference prototype:** `mockups/healthbar-interactive.html` — a working single-file
prototype of the entire app. Keep it in the repo; the prompts tell Claude Code to treat it
as the visual/behavioral spec. When in doubt, the prototype is the source of truth.

---

## Prompt 1 — Scaffold + design system

```
Create a new web app called "Health Bar" — an installable PWA life/token tracker for
Magic: The Gathering.

Stack: Vite + TypeScript, no UI framework (vanilla TS with small view modules), no
backend, no external runtime dependencies. All state lives in memory with persistence to
localStorage. Target: mobile Safari (iPad/iPhone) and Android Chrome first, desktop second.

There is a complete working prototype at mockups/healthbar-interactive.html in this repo.
Open it and study it before writing code — it is the spec for theme, layout, and behavior.
Port its design system into src/styles/:

- Dark leather table background (#120d09 range), parchment surfaces, gold trim
  (#c9a64b range), engraved-serif look.
- Fonts: Cinzel Decorative (titles), Cinzel (labels/numbers), EB Garamond (body).
  Self-host via @fontsource packages so the app works offline.
- The five MTG mana symbols (white sun, blue droplet, black skull, red flame, green tree)
  plus colorless, as inline SVG components on their mana-circle background colors.
  Keep them in one file (src/ui/manaSymbols.ts) so they are trivially swappable —
  these are Wizards of the Coast IP and may need replacing before public release.
- Color identity = a free combination of the five colors (W/U/B/R/G) or colorless (C,
  standalone). There are NO preset guilds — any subset of WUBRG is valid, stored in
  canonical WUBRG order; all five = "Rainbow". From the combination derive: a frame
  gradient (card background), a bar-fill gradient, and swatch rendering (mana circles
  for 1–2 colors, a conic multi-color dot for 3+). Copy the exact per-color gradient
  stops and blending rules from the prototype.
- Global CSS: no visible scrollbars anywhere (scrolling still works), no text selection,
  no double-tap zoom, no pull-to-refresh, safe-area-inset padding, 100dvh layout.
- Finish quality (copy from the prototype's final "polish pass" + "deep polish" CSS
  blocks): shared elevation tokens (--e1/--e2/--e3) and one transition token used
  everywhere; SVG-noise vellum grain overlay; layered card lighting (gold trim + top
  sheen + bottom vignette) with filigree corner brackets; the life total in bright
  white with letterpress + glow shadows (NO gradient/foil fill on the number, and NO
  watermark symbol behind the card — both were tried and rejected);
  a damage-trail life bar (red ghost fill that lingers ~1s
  behind the real fill on loss); pending badge colored by sign (gain green / loss
  ember); rail chips carrying the owner's color gradient on their left spine; glassy
  meter troughs; parchment paper fiber; engraved circular plates for bottom-dock
  buttons; scroll areas that fade out at their edges (mask-image) instead of clipping;
  grab-notch on bottom sheets; hover + press feedback (~150ms) on every interactive
  element; :focus-visible rings; ambient animations (turn-chip glow, sheet rise, title
  foil shimmer, defeat-skull pulse) gated behind prefers-reduced-motion.

Deliverables: running `npm run dev` shows a themed shell page with the app title and one
sample player card rendering each identity correctly. No game logic yet.
```

## Prompt 2 — Game state model

```
Implement the core game state in src/state/ (plain TypeScript, no framework), matching the
prototype's behavior exactly:

- Player: name (max 14 chars), colors (array of W/U/B/R/G in canonical order, or ['C']),
  bars[], dead flag.
- Bar types: life, commanderHealth (max 21), poison (max 10), energy (max 20),
  extraHealth, custom (user-named counter with user-chosen max — loyalty, experience,
  storm, etc.; starts at 0, resets to 0), token. Tokens carry: name (max 20), basePower, baseToughness, current
  toughness, count, plusMinusCounters (an integer; +1/+1 counters raise power AND max
  toughness, −1/−1 lower both).
- Game modes: Normal (20 starting life) and Commander (40 starting life, every player
  automatically gets a commanderHealth bar). Custom starting life supported.
- Start-of-game rule: on game start and on reset, life / extraHealth / commanderHealth
  bars are set to FULL; poison and energy to 0; token bars keep their configured state.
- Two restart operations: resetDuel() (same players, bars back to starting values,
  deaths cleared, stay in game) and newGame() (bars wiped back to mode defaults —
  tokens and extra bars removed — names/colors kept, return to setup).
- Death rules: main life hitting 0, ANY commanderHealth bar hitting 0, OR any poison
  bar reaching its max (10 poison kills, per MTG rules) marks the player dead. A dead
  player can be resurrected: a pool that hit 0 is set to 1, a maxed poison bar backs
  off to max−1, and dead is cleared. Tokens auto-delete when toughness hits 0 or count
  hits 0.
- Commander health is fully independent of the main life total: changing a
  commanderHealth bar never touches life, and vice versa. (A commander-damage→life
  mirror was tried and rejected — do not reintroduce it.) commanderHealth is clamped
  to [0, 21]. Per-opponent tracking = one commanderHealth bar per opposing commander
  (add more via Summon Another Bar, rename to the opponent).
- Turn system: turnIndex, viewIndex, round counter. nextPlayer()/prevPlayer() skip dead
  players; wrapping forward past the last living player increments the round, wrapping
  backward decrements (min 1).
- Seat order is player-array order; support swapping two players and reordering.
- Persist the full game state to localStorage on every mutation; restore on load so a
  refresh mid-game loses nothing.

Include the token catalog from the prototype (~70 known MTG tokens: artifact tokens like
Treasure/Food/Clue/Blood/Gold/Map/Powerstone/Junk/Incubator at 0/1, creature tokens with
real P/T like Soldier 1/1, Zombie 2/2, Beast 3/3, Angel 4/4, Dragon 5/5, Wurm 6/6,
Kraken 8/8, Eldrazi 10/10, X/X tokens at 1/1) plus custom tokens. Copy the full list from
the TOKENS array in the prototype.

Write unit tests (vitest) for: start-of-game fill rules, death + resurrect (including
poison death at max), commander-health independence from life (changing one never
changes the other) and its [0, 21] clamping, token counter
math, token auto-delete, turn cycling with dead players, round counting.
```

## Prompt 3 — Setup screens

```
Build the pre-game screens, visually matching the prototype (mockups/healthbar-interactive.html):

1. Setup screen: game-mode selector (NORMAL 20 life / COMMANDER 40 life + cmd bar),
   player count stepper (1–6; 1 = solo/personal-device mode where each player runs the
   app on their own phone), starting-life presets (20/30/40/custom), player list
   ("The Table") where each row shows name, identity swatch, extra-bar count, and ↑/↓
   reorder arrows. "Begin the Duel" button starts the game.
2. Edit Planeswalker screen (tap a player row): themed name input; a color picker that
   is a single row of the six mana symbols (W U B R G + colorless) acting as multi-select
   toggles — tap to mix any combination, unselected symbols dim, colorless is exclusive,
   at least one color always selected, with a live preview (swatch + gradient bar +
   combination name, all five = "Rainbow"); and a Bars section to pre-add
   commanderHealth / poison / energy / extraHealth / custom-counter / token bars, rename
   any non-life bar (pencil icon), and delete bars. Custom counter asks for a name and a
   max via a themed dialog. Adding a token opens the token picker.
3. Token picker: searchable full-screen list of the token catalog, "Custom Token…" entry
   at top (name + P/T), one token added per pick.

New players default to an unused mono color and can immediately change it. All screens
scroll without visible scrollbars and respect safe areas.
```

## Prompt 4 — Battlefield (the main screen)

```
Build the battlefield screen exactly per the prototype:

TWO LAYOUT MODES, chosen by width/orientation (WindowSizeClass equivalent):
- WIDE (tablet / landscape): framed-card look — the board is a rounded card with gold
  trim and filigree corners, and a LEFT RAIL holds the players as a vertical stack:
  round tag (R1) at top, then one chip per player with color dot + name + current life
  (skull if dead), each chip carrying the owner's color gradient on its left spine.
- COMPACT (phone portrait): FULL-BLEED board — no card frame; the player's color
  gradient fills the screen edge-to-edge (subtle top/bottom vignette only). The players
  float over the board's top-left as small translucent blurred pills (color dot + life
  only, no names; parchment pill = current turn), with the round tag above them. The
  hint line floats over the gradient at the bottom.
In both modes: current turn = parchment/gold highlight; currently viewed = white
outline; tap a chip to view that player; the rail/pills scroll if needed.
SOLO MODE (1 player): the board uses the FULL-BLEED layout on EVERY device (tablet
included — scale the numbers up to fill it), with no rail/pills, no round tag, and
turn-pass swipes disabled (nothing to pass to); taps, pools, tokens, menu, drawer, and
death/resurrect all work normally. Token placement follows the width rule even in
full-bleed: COMPACT keeps the bottom token row, but WIDE (tablet/landscape) keeps the
black token cutout docked on the right with the pools shifted left, and the token
editor slides out over the pools area — same as the framed layout. Adding a player
mid-game returns to the multiplayer layout.

MAIN PANEL (rest of the screen, one player at a time):
- Minimal header: name + mana symbols top-left directly on the card background, burger
  menu button top-right (opens the player detail screen).
- Health and Commander are MATCHED POOL SECTIONS with identical structure, stacked with
  a thin gold divider between them: bar name above in small caps ("HEALTH" /
  "COMMANDER", renameable), then a centered row of round − button · big number · round
  + button, then the bar-shaped meter beneath (identity gradient for health, gold for
  commander; the two numbers use the IDENTICAL font size, weight, and shadow treatment
  in every mode — no scale difference). Health additionally keeps
  invisible left/right tap halves on the panel for −1/+1, plus the pending-change badge
  ("−3", green for gain / ember for loss) fading after ~1.4s. Default bar names are
  "Health" and "Commander".
- Poison, energy, extra-health, and custom-counter bars remain compact strips (icon,
  value, thin bar, −/+ at the ends) below the pools; custom counters use a diamond icon
  and gold fill.
- SOUND & HAPTICS: short synthesized cues via WebAudio (no audio assets) — low
  down-tick on damage, brighter up-tick on gain, rising swish on turn pass, low
  descending sting on a death. Vibration API alongside (~8ms pulse on changes, a
  [60,40,120] pattern on death; silently no-op where unsupported, e.g. iOS Safari).
  All gated by the drawer's mute toggle; keep volumes subtle (≤ −18dBFS feel).
- TOKENS: in WIDE mode, a black column on the right lists tokens (name ×count, P/T,
  thin hp bar, gold counter chip when +1/+1 or −1/−1 counters are present) and tapping
  one slides the TOKEN EDITOR out to the left of the column. In COMPACT full-bleed
  mode, tokens are instead a centered row of translucent blurred cards along the BOTTOM
  of the board (horizontally scrollable), and tapping one opens the same editor as a
  floating card anchored in the LOWER part of the screen, rising from just above the
  token row (never overlapping the floating player pills or header) while the pools
  blur/dim behind it. Editor contents in both:
  rename, close, P/T ×count readout, counters line, button grid (+1/+1, −1/−1, ±hp,
  ±tok), DESTROY. Scrollable if it doesn't fit.
- Dead player: dark overlay, skull, "YOU'VE LOST", RESURRECT button; controls locked.

GESTURES: swipe LEFT anywhere on the panel = next player's turn; swipe RIGHT = previous.
Drag feedback follows the finger (panel translates + fades); release past ~70px of
clearly-horizontal travel commits, otherwise springs back. Long-press (~450ms) opens the
player detail screen; any 10px of movement cancels it. Taps on strips/tokens never
trigger life taps or swipes.

TOOL DRAWER (no persistent bar): the game tools live in a collapsed drawer at the
BOTTOM CENTER of the screen. A small gold-ribbed tab (~78px wide) sits flush at the
bottom edge; swiping UP from the bottom edge zone or tapping the tab slides the drawer
up over the board with a light scrim. It holds six engraved circular buttons in a
horizontal row: setup (back, state kept) · d20 roll-off for all players (crowns the
winner) · swap-seats toggle · reset · add player · sound mute toggle (stays open when
tapped, dims when muted). Tapping any other tool auto-closes the
drawer; swiping it downward or tapping the scrim also closes it. The vertical open
gesture must not conflict with the board's horizontal turn-swipes. Tools in detail:
d20 roll-off crowns the winner ·
reset sheet with TWO actions — "Reset Duel" (same players, every bar back to its
starting value, deaths cleared) and "New Game" (wipes bars back to mode defaults, keeps
names/colors, returns to the setup screen for renaming/re-configuring before beginning
again) · add player mid-game (creates the player with an unused mono color, then opens
their Edit Planeswalker screen so they pick name/colors/bars; DONE lands the view on
their board) · swap-seats toggle (tap two rail chips to trade seats).

PLAYER DETAIL screen (burger): full bar management (add/rename/delete any bar), ±X
keypad with live preview and MTG verbs ("Deal 7 Damage" / "Gain 7 Life"), quick
−5/−1/+1/+5 for life.

ADAPTIVE LAYOUT: this must be responsive — portrait phone (compact type), landscape
tablet/iPad (larger type, thicker bars, roomier token column), fluid clamp() sizing in
between. Match the prototype's phone vs tablet proportions.
```

## Prompt 5 — Turn transition animations

```
Port the three turn-transition animations from the prototype, selectable in a small
settings sheet (default: Combat Slash):

1. Draw Slide — new board slides in from the right (from the left when going to the
   previous player), 320ms.
2. Planeswalk — violet portal iris expands while the board arrives from depth with a
   hue-shift/blur settle, 550ms.
3. Combat Slash — snapshot the OUTGOING player's rendered panel (live DOM/canvas
   snapshot, not a plain gradient), then: first white blade-streak cuts it diagonally and
   the wound parts to reveal the incoming board through the gap; second streak crosses
   it; the four severed quarters fly off in different directions with a gold spark burst;
   the incoming board takes a small impact shake. ~850ms total.

All animations respect prefers-reduced-motion (instant switch, no motion). They fire on
swipe-committed turn changes and on rail-chip taps.
```

## Prompt 6 — PWA + deploy

```
Make it an installable, offline, table-ready PWA and deploy it:

- Web app manifest: name "Health Bar", standalone display, landscape-friendly, themed
  colors, full icon set (192/512 + maskable + apple-touch-icon). Generate a gold-on-black
  heart-and-bar icon in the app's engraved-gold style.
- iOS meta tags: apple-mobile-web-app-capable, status-bar style, splash behavior sane on
  iPad Safari.
- Service worker (vite-plugin-pwa): precache the full app so it works with zero network
  at the game table; auto-update on new deploys with a subtle "new version" toast.
- Screen Wake Lock API while a game is active (re-acquire on visibilitychange), so the
  tablet never sleeps mid-game. Fallback: no-op where unsupported.
- Prevent iOS Safari rubber-banding, double-tap zoom, and text selection during play.
- Set up deployment to GitHub Pages via a GitHub Actions workflow on push to main
  (vite base path configured). Output the final URL. Alternative: netlify.toml included
  so drag-and-drop to Netlify also works.

Acceptance: opening the URL on an iPad, adding to Home Screen, enabling airplane mode,
and launching → the app opens full-screen, offline, and holds the screen awake during a
game.
```

---

## Notes

- **IP caution:** mana symbols, guild names, token names, and "Magic: The Gathering"
  are Wizards of the Coast property. Fine for personal use; before any public/monetized
  release, swap `manaSymbols.ts` and flavor strings for original equivalents (the code
  keeps them isolated for exactly this reason).
- **Order matters:** each prompt assumes the previous one is merged and working. Ask
  Claude Code to run the vitest suite after prompts 2–5.
- **Prototype parity check (good final prompt):** "Open mockups/healthbar-interactive.html
  side by side with the app and list any visual or behavioral differences, then fix them."
