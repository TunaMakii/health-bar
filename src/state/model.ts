/**
 * model.ts — pure game logic. No DOM, no rendering, no sound: every function
 * here operates on plain `GameState` data so it can be unit-tested directly.
 * Behaviour mirrors mockups/healthbar-interactive.html exactly.
 */
import type { Bar, GameMode, GameState, ManaKey, Player } from './types'
import { TOKENS, tokenPower, type TokenDef } from './tokens'

export const COLOR_KEYS: ManaKey[] = ['W', 'U', 'B', 'R', 'G']

export function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v))
}

/** default counter/bar definitions summoned from the "add bar" sheet */
export const BARDEFS = {
  cmd: { name: 'Commander', value: 21, max: 21 },
  poison: { name: 'Poison Counters', value: 0, max: 10 },
  energy: { name: 'Energy Counters', value: 0, max: 20 },
} as const

/* ── bar + player factories ── */
export function makeLifeBar(startLife: number): Bar {
  return { type: 'life', name: 'Health', value: startLife, max: startLife }
}
export function makeCmdBar(): Bar {
  return { type: 'cmd', ...BARDEFS.cmd }
}
export function makePlayer(n: number, colors: ManaKey[], mode: GameMode, startLife: number): Player {
  const bars: Bar[] = [makeLifeBar(startLife)]
  if (mode === 'commander') bars.push(makeCmdBar())
  return { name: 'Player ' + n, colors, bars, pending: 0, dead: false }
}

/** first mono colour no one is using yet, for freshly-added players */
export function nextColors(players: Player[]): ManaKey[] {
  const c = COLOR_KEYS.find((k) => !players.some((p) => p.colors.length === 1 && p.colors[0] === k))
  return [c || COLOR_KEYS[players.length % 5]]
}

/** brand-new game with the prototype's default four planeswalkers */
export function createGame(): GameState {
  const mode: GameMode = 'commander'
  const startLife = 40
  const players = [
    makePlayer(1, ['R', 'W'], mode, startLife),
    makePlayer(2, ['U', 'B'], mode, startLife),
    makePlayer(3, ['G'], mode, startLife),
    makePlayer(4, ['R', 'G'], mode, startLife),
  ]
  return { mode, startLife, players, turnIdx: 0, viewIdx: 0, round: 1 }
}

/* ── setup mutations ── */
export function setMode(game: GameState, mode: GameMode): void {
  game.mode = mode
  game.startLife = mode === 'commander' ? 40 : 20
  game.players.forEach((p) => {
    const lb = p.bars[0]
    lb.value = game.startLife
    lb.max = game.startLife
    const hasCmd = p.bars.some((b) => b.type === 'cmd')
    if (mode === 'commander' && !hasCmd) p.bars.push(makeCmdBar())
    if (mode === 'normal') p.bars = p.bars.filter((b) => b.type !== 'cmd')
  })
}

export function setLife(game: GameState, v: number): void {
  game.startLife = v
  game.players.forEach((p) =>
    p.bars.forEach((b) => {
      if (b.type === 'life' || b.type === 'extra') {
        b.value = v
        b.max = v
      }
    }),
  )
}

/** returns false if the requested count is out of the [1,6] range */
export function changePlayerCount(game: GameState, d: number): boolean {
  if (d > 0 && game.players.length < 6) {
    game.players.push(makePlayer(game.players.length + 1, nextColors(game.players), game.mode, game.startLife))
    return true
  }
  if (d < 0 && game.players.length > 1) {
    game.players.pop()
    return true
  }
  return false
}

export function movePlayer(game: GameState, i: number, d: number): void {
  const j = i + d
  if (j < 0 || j >= game.players.length) return
  ;[game.players[i], game.players[j]] = [game.players[j], game.players[i]]
}

/* ── game lifecycle ── */
/** on game start: health pools full, counters empty, tokens keep their config */
export function startGame(game: GameState): void {
  game.players.forEach((p) =>
    p.bars.forEach((b) => {
      if (b.type === 'life' || b.type === 'extra' || b.type === 'cmd') b.value = b.max
      else if (b.type === 'poison' || b.type === 'energy' || b.type === 'custom') b.value = 0
      /* tokens keep whatever hp/count was configured */
    }),
  )
  game.players.forEach((p) => {
    p.pending = 0
    p.dead = false
  })
  game.turnIdx = 0
  game.viewIdx = 0
  game.round = 1
}

/** Reset Duel — same players, every bar back to its starting value, deaths cleared */
export function resetDuel(game: GameState): void {
  game.players.forEach((p) =>
    p.bars.forEach((b) => {
      if (b.type === 'life' || b.type === 'extra') {
        b.value = game.startLife
        b.max = game.startLife
      } else if (b.type === 'cmd') b.value = b.max
      else if (b.type === 'poison' || b.type === 'energy' || b.type === 'custom') b.value = 0
    }),
  )
  game.players.forEach((p) => {
    p.dead = false
    p.pending = 0
  })
}

/** New Game — wipe to mode defaults (tokens & extra bars removed), keep names/colors */
export function newGame(game: GameState): void {
  game.players.forEach((p) => {
    p.bars = [makeLifeBar(game.startLife)]
    if (game.mode === 'commander') p.bars.push(makeCmdBar())
    p.dead = false
    p.pending = 0
  })
  game.turnIdx = 0
  game.viewIdx = 0
  game.round = 1
}

/* ── death + resurrection ── */
export function aliveCount(game: GameState): number {
  return game.players.filter((p) => !p.dead).length
}

/**
 * Recompute a player's dead flag and auto-delete dead token squads.
 * Death = main life at 0, ANY commander-health bar at 0, OR any poison at max.
 * Returns true if this call newly killed the player (caller may play a sound).
 */
export function checkState(game: GameState, i: number): boolean {
  const p = game.players[i]
  const was = p.dead
  p.bars = p.bars.filter((b) => !(b.type === 'token' && (b.value <= 0 || (b.count || 0) <= 0)))
  p.dead =
    p.bars[0].value <= 0 ||
    p.bars.some((b) => b.type === 'cmd' && b.value <= 0) ||
    p.bars.some((b) => b.type === 'poison' && b.value >= b.max)
  return !was && p.dead
}

/** Resurrect: the pool that hit 0 is set to 1 (maxed poison backs off to max−1) */
export function revive(game: GameState, i: number): void {
  const p = game.players[i]
  p.bars.forEach((b) => {
    if ((b.type === 'life' || b.type === 'cmd') && b.value <= 0) b.value = 1
    if (b.type === 'poison' && b.value >= b.max) b.value = b.max - 1
  })
  p.dead = false
}

/* ── turn system ── */
export function nextAlive(game: GameState, from: number): number {
  if (aliveCount(game) === 0) return from
  let i = from
  do {
    i = (i + 1) % game.players.length
  } while (game.players[i].dead)
  return i
}

export interface StepResult {
  moved: boolean
  dir?: number
}

/** advance/retreat the turn to the next living player, counting rounds on wrap */
export function stepPlayer(game: GameState, dir: number): StepResult {
  const n = game.players.length
  if (n < 2 || aliveCount(game) === 0) return { moved: false }
  let i = game.viewIdx
  do {
    i = (i + dir + n) % n
  } while (game.players[i].dead)
  if (dir > 0 && i <= game.viewIdx) game.round++
  if (dir < 0 && i >= game.viewIdx) game.round = Math.max(1, game.round - 1)
  game.turnIdx = i
  game.viewIdx = i
  return { moved: true, dir }
}

/* ── life / counter mutations (data only; views handle DOM + sound + persist) ── */
/** apply a delta to the main life pool and the pending accumulator */
export function applyLife(p: Player, d: number): void {
  p.bars[0].value += d
  p.pending += d
}

/** panel −/+ on a non-life bar. Returns true if the bar/token just died. */
export function stripDelta(bar: Bar, d: number): boolean {
  if (bar.type === 'token') {
    bar.count = clamp((bar.count || 0) + d, 0, 99)
    return bar.value <= 0 || bar.count <= 0
  }
  if (bar.type === 'cmd') {
    bar.value = clamp(bar.value + d, 0, bar.max)
    return bar.value <= 0
  }
  bar.value = clamp(bar.value + d, 0, 999)
  return false
}

/** detail-screen ±X on any bar, with the prototype's per-type clamps */
export function changeBar(bar: Bar, d: number): void {
  const isLife = bar.type === 'life' || bar.type === 'extra'
  bar.value = clamp(bar.value + d, isLife ? -99 : 0, bar.type === 'cmd' ? bar.max : 999)
}

/* ── token squad math (returns true if the squad died and should be removed) ── */
export function tokCtr(bar: Bar, d: number): boolean {
  bar.counters = (bar.counters || 0) + d
  bar.value += d
  bar.max += d
  return bar.value <= 0 || bar.max <= 0
}
export function tokHp(bar: Bar, d: number): boolean {
  bar.value = clamp(bar.value + d, 0, bar.max)
  return bar.value <= 0
}
export function tokCnt(bar: Bar, d: number): boolean {
  bar.count = clamp((bar.count || 0) + d, 0, 99)
  return bar.count <= 0
}

/* ── token creation ── */
export function makeTokenBar(name: string, hp: number, power?: number): Bar {
  return { type: 'token', name, value: hp, max: hp, power: power == null ? hp : power, counters: 0, count: 1 }
}
export function tokenBarFromCatalog(i: number): Bar {
  const t: TokenDef = TOKENS[i]
  return makeTokenBar(t[0], t[2], tokenPower(t))
}

/** current effective power/toughness string for a token squad */
export function tokPT(b: Bar): string {
  return `${(b.power || 0) + (b.counters || 0)}/${b.value}`
}
