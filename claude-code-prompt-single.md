# Health Bar — Single-Prompt Build (Web / PWA)

Copy everything inside the code fence below into Claude Code as ONE prompt. Requirements:
the repo must contain `mockups/healthbar-interactive.html` (the prototype — it is the
design and behavior spec the prompt constantly refers to).

---

```
Build a complete, installable PWA called "Health Bar" — an MTG life, counter, and token
tracker. One URL that works on iPad, Android phones/tablets, and desktop.

THE SPEC: there is a complete working prototype at mockups/healthbar-interactive.html in
this repo. Open it and study it thoroughly before writing any code. It is the source of
truth for theme, layout, sizing, and behavior — when anything below is ambiguous, match
the prototype. Build the app in the phase order below, and after each phase run the app
and the tests before moving on.

STACK: Vite + TypeScript, no UI framework (vanilla TS with small view modules), no
backend, no external runtime dependencies. All state in memory, persisted to localStorage
on every mutation and restored on load (a refresh mid-game must lose nothing). Target
mobile Safari (iPad/iPhone) and Android Chrome first, desktop second.

━━━ PHASE 1: SCAFFOLD + DESIGN SYSTEM ━━━

- Dark leather table background (#120d09 range), parchment surfaces, gold trim (#c9a64b
  range), engraved-serif look. Fonts: Cinzel Decorative (titles), Cinzel (labels/numbers),
  EB Garamond (body) — self-hosted via @fontsource so the app works offline.
- The five MTG mana symbols (white sun, blue droplet, black skull, red flame, green tree)
  plus colorless, as inline SVGs on their mana-circle background colors. Keep them in ONE
  file (src/ui/manaSymbols.ts) so they're trivially swappable — they are Wizards of the
  Coast IP and may need replacing before public release.
- Color identity = a free combination of W/U/B/R/G, or colorless (C, standalone). NO
  preset guilds. Store in canonical WUBRG order; all five = "Rainbow". Derive from the
  combination: frame gradient (card background), bar-fill gradient, and swatch (mana
  circles for 1–2 colors, conic multi-color dot for 3+). Copy exact gradient stops and
  blending from the prototype.
- Global CSS: no visible scrollbars (scrolling still works), no text selection, no
  double-tap zoom, no pull-to-refresh, safe-area-inset padding, 100dvh layout.
- Finish quality (copy the prototype's "polish pass" + "deep polish" CSS blocks): shared
  elevation tokens (--e1/--e2/--e3) and one ~150ms transition token everywhere; SVG-noise
  vellum grain overlay; layered card lighting (gold trim + top sheen + bottom vignette)
  with filigree corner brackets; life total in bright white with letterpress + glow
  shadows (NO gradient/foil fill on the number, NO watermark symbol behind the card —
  both were tried and rejected); damage-trail life bar (red ghost fill lingering ~1s
  behind the real fill on loss); pending badge colored by sign (gain green / loss ember);
  rail chips carrying the owner's color gradient on their left spine; glassy meter
  troughs; parchment paper fiber; engraved circular plates for dock buttons; scroll areas
  fading at their edges (mask-image) instead of clipping; grab-notch on bottom sheets;
  hover + press feedback on every interactive element; :focus-visible rings; ambient
  animations (turn-chip glow, sheet rise, title foil shimmer, defeat-skull pulse) gated
  behind prefers-reduced-motion.

━━━ PHASE 2: GAME STATE MODEL (src/state/, plain TS) ━━━

- Player: name (max 14 chars), colors (WUBRG-ordered array or ['C']), bars[], dead flag.
- Bar types: life, commanderHealth (max 21), poison (max 10), energy (max 20),
  extraHealth, custom (user-named counter with user-chosen max — loyalty, experience,
  storm…; starts at 0, resets to 0), token. Tokens carry: name (max 20), basePower,
  baseToughness, current toughness, count, plusMinusCounters (integer; +1/+1 counters
  raise power AND max toughness, −1/−1 lower both).
- Game modes: Normal (20 starting life) and Commander (40 starting life, every player
  auto-gets a commanderHealth bar). Custom starting life supported.
- Start-of-game rule: on game start and on reset, life / extraHealth / commanderHealth
  bars set to FULL; poison and energy to 0; token bars keep their configured state.
- Two restart operations: resetDuel() (same players, bars back to starting values, deaths
  cleared, stay in game) and newGame() (bars wiped to mode defaults — tokens and extra
  bars removed — names/colors kept, return to setup).
- Death rules: main life at 0, ANY commanderHealth bar at 0, OR any poison bar at max
  (10 poison kills) marks the player dead. Resurrect: the pool that hit 0 is set to 1
  (maxed poison backs off to max−1), dead cleared. Tokens auto-delete when toughness or
  count hits 0.
- Commander health is FULLY INDEPENDENT of the main life total: changing one never
  touches the other. (A commander-damage→life mirror was tried and rejected — do not
  reintroduce it.) commanderHealth clamps to [0, 21]. Per-opponent tracking = one
  commanderHealth bar per opposing commander (added via Summon Another Bar, renamed).
- Turn system: turnIndex, viewIndex, round counter. nextPlayer()/prevPlayer() skip dead
  players; wrapping forward past the last living player increments the round, wrapping
  backward decrements (min 1). Seat order = player-array order; support swapping two
  players and reordering.
- Token catalog: copy the full TOKENS array from the prototype (~70 known MTG tokens —
  artifact tokens like Treasure/Food/Clue/Blood/Gold/Map/Powerstone/Junk/Incubator at
  0/1, creature tokens with real P/T like Soldier 1/1, Zombie 2/2, Beast 3/3, Angel 4/4,
  Dragon 5/5, Wurm 6/6, Kraken 8/8, Eldrazi 10/10, X/X tokens at 1/1) plus custom.
- Unit tests (vitest): start-of-game fill rules, death + resurrect (incl. poison death at
  max), commander-health independence from life (changing one never changes the other)
  and its [0,21] clamping, token counter math, token auto-delete, turn cycling with dead
  players, round counting.

━━━ PHASE 3: SETUP SCREENS ━━━

1. Setup screen: game-mode selector (NORMAL 20 / COMMANDER 40 + cmd bar), player count
   stepper (1–6; 1 = solo/personal-device mode), starting-life presets (20/30/40/custom),
   player list ("The Table") — each row shows name, identity swatch, extra-bar count, and
   ↑/↓ reorder arrows. "Begin the Duel" starts the game.
2. Edit Planeswalker screen (tap a player row): themed name input; color picker = a
   single row of the six mana symbols as multi-select toggles (unselected dim, colorless
   exclusive, at least one always selected) with live preview (swatch + gradient bar +
   combination name, all five = "Rainbow"); Bars section to pre-add commanderHealth /
   poison / energy / extraHealth / custom-counter / token bars, rename any non-life bar
   (pencil icon), delete bars. Custom counter asks name + max via themed dialog. Adding a
   token opens the token picker.
3. Token picker: searchable full-screen list of the catalog, "Custom Token…" entry at top
   (name + P/T), one token added per pick.
New players default to an unused mono color. All screens scroll without visible
scrollbars and respect safe areas.

━━━ PHASE 4: BATTLEFIELD (MAIN SCREEN) ━━━

TWO LAYOUT MODES chosen by width/orientation:
- WIDE (tablet/landscape): framed-card board (rounded card, gold trim, filigree corners)
  + LEFT RAIL of players as a vertical stack — round tag (R1) on top, then one chip per
  player with color dot + name + current life (skull if dead), color-gradient left spine.
- COMPACT (phone portrait): FULL-BLEED board — no frame; the player's color gradient
  fills the screen edge-to-edge (subtle top/bottom vignette). Players float top-left as
  small translucent blurred pills (color dot + life only; parchment pill = current turn),
  round tag above, hint line floating at the bottom.
In both: current turn = parchment/gold highlight; viewed = white outline; tap a chip to
view that player; rail/pills scroll if needed.
SOLO MODE (1 player): FULL-BLEED on EVERY device (tablet scales numbers up to fill), no
rail/pills/round tag, turn swipes disabled; everything else works normally. Token
placement still follows the width rule: COMPACT = bottom token row, WIDE = black token
cutout on the right with pools shifted left and the editor sliding out over the pools.
Adding a player mid-game returns to the multiplayer layout.

MAIN PANEL (one player at a time):
- Minimal header: name + mana symbols top-left directly on the background, burger menu
  top-right (opens player detail).
- Health and Commander are MATCHED POOL SECTIONS, identical structure, thin gold divider
  between: small-caps bar name above ("HEALTH" / "COMMANDER", renameable), centered row
  of round − · big number · round +, meter beneath (identity gradient for health, gold
  for commander). The two numbers use IDENTICAL font size/weight/shadows in every mode.
  Health also keeps invisible left/right tap halves on the panel for −1/+1 and the
  pending-change badge ("−3", green gain / ember loss) fading after ~1.4s. Default names
  "Health" and "Commander".
- Poison, energy, extra-health, custom-counter bars are compact strips (icon, value, thin
  bar, −/+ at the ends) below the pools; custom counters use a diamond icon, gold fill.
- TOKENS: WIDE mode — black column on the right (name ×count, P/T, thin hp bar, gold
  counter chip when ± counters present); tapping one slides the TOKEN EDITOR out to the
  left of the column. COMPACT mode — centered row of translucent blurred cards along the
  BOTTOM (horizontally scrollable); tapping one opens the same editor as a floating card
  anchored in the LOWER part of the screen, rising from just above the token row (never
  overlapping the pills or header) while the pools blur/dim behind. Editor contents:
  rename, close, P/T ×count readout, counters line, button grid (+1/+1, −1/−1, ±hp,
  ±tok), DESTROY. Scrollable if it doesn't fit.
- Dead player: dark overlay, skull, "YOU'VE LOST", RESURRECT button; controls locked.
- SOUND & HAPTICS: short synthesized WebAudio cues (no audio assets) — low down-tick on
  damage, brighter up-tick on gain, rising swish on turn pass, low sting on death.
  Vibration API alongside (~8ms pulse on changes, [60,40,120] on death; no-op where
  unsupported). All gated by the drawer's mute toggle; volumes subtle.

GESTURES: swipe LEFT anywhere on the panel = NEXT player's turn; swipe RIGHT = PREVIOUS.
(This direction is deliberate — do not flip it.) Drag feedback follows the finger (panel
translates + fades); release past ~70px of clearly-horizontal travel commits, otherwise
springs back. Long-press (~450ms) opens player detail; 10px of movement cancels it. Taps
on strips/tokens never trigger life taps or swipes.

TOOL DRAWER (no persistent bar): collapsed drawer at the BOTTOM CENTER — a small
gold-ribbed tab (~78px) flush at the bottom edge; swipe UP from the bottom zone or tap
the tab to slide it up over the board with a light scrim. Six engraved circular buttons
in a horizontal row: setup (back, state kept) · d20 roll-off for all players (crowns the
winner) · swap-seats toggle (tap two chips to trade seats) · reset · add player · sound
mute toggle (stays open when tapped, dims when muted). Other tools auto-close the drawer;
swipe down or scrim-tap also closes. Reset opens a sheet with TWO actions: "Reset Duel"
(resetDuel) and "New Game" (newGame → setup screen). Add player mid-game creates the
player with an unused mono color and opens their Edit Planeswalker screen; DONE lands the
view on their board. The vertical open gesture must not conflict with horizontal
turn-swipes.

PLAYER DETAIL (burger): full bar management (add/rename/delete any bar), ±X keypad with
live preview and MTG verbs ("Deal 7 Damage" / "Gain 7 Life"), quick −5/−1/+1/+5 for life.

ADAPTIVE: fully responsive — portrait phone (compact type), landscape tablet/iPad (larger
type, thicker bars, roomier token column), fluid clamp() sizing between. Match the
prototype's phone vs tablet proportions.

━━━ PHASE 5: TURN TRANSITION ANIMATIONS ━━━

Three animations, selectable in a small settings sheet (default: Combat Slash):
1. Draw Slide — new board slides in from the right (from the left when going backward),
   320ms.
2. Planeswalk — violet portal iris expands while the board arrives from depth with a
   hue-shift/blur settle, 550ms.
3. Combat Slash — snapshot the OUTGOING player's rendered panel (live DOM/canvas
   snapshot, not a plain gradient), then: first white blade-streak cuts it diagonally and
   the wound parts to reveal the incoming board through the gap; second streak crosses
   it; the four severed quarters fly off in different directions with a gold spark burst;
   the incoming board takes a small impact shake. ~850ms.
All respect prefers-reduced-motion (instant switch). They fire on swipe-committed turn
changes and rail-chip taps.

━━━ PHASE 6: PWA + DEPLOY ━━━

- Manifest: name "Health Bar", standalone, themed colors, full icon set (192/512 +
  maskable + apple-touch-icon) — generate a gold-on-black heart-and-bar icon in the
  engraved-gold style.
- iOS meta tags: apple-mobile-web-app-capable, status-bar style, sane splash on iPad.
- Service worker (vite-plugin-pwa): precache everything for full offline play;
  auto-update with a subtle "new version" toast.
- Screen Wake Lock API while a game is active (re-acquire on visibilitychange); no-op
  where unsupported.
- Prevent iOS rubber-banding, double-tap zoom, text selection during play.
- GitHub Actions workflow deploying to GitHub Pages on push to main (vite base path
  configured); output the final URL. Also include netlify.toml as an alternative.

━━━ FINAL VERIFICATION ━━━

1. Run the full vitest suite — all green.
2. Open mockups/healthbar-interactive.html side by side with the built app and list any
   visual or behavioral differences, then fix them.
3. Acceptance: opening the deployed URL on an iPad, adding to Home Screen, enabling
   airplane mode, launching → the app opens full-screen, offline, and holds the screen
   awake during a game.

IP note: mana symbols, token names, and "Magic: The Gathering" are Wizards of the Coast
property — fine for personal use; manaSymbols.ts isolates them for later replacement.
```
