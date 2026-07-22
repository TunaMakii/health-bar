/** Core game data model. Pure data — no DOM, no rendering. */
import type { ManaKey } from '../ui/manaSymbols'

export type { ManaKey }

export type BarType = 'life' | 'cmd' | 'poison' | 'energy' | 'extra' | 'custom' | 'token'

export interface Bar {
  type: BarType
  name: string
  value: number
  max: number
  /** token-only — base power (before ± counters); toughness lives in `value` */
  power?: number
  /** token-only — running +1/+1 (positive) or −1/−1 (negative) counter total */
  counters?: number
  /** token-only — how many copies of the token */
  count?: number
}

export interface Player {
  name: string
  colors: ManaKey[]
  bars: Bar[]
  /** transient pending-change accumulator shown as a badge; not core to death rules */
  pending: number
  dead: boolean
}

export type GameMode = 'normal' | 'commander'

export interface GameState {
  mode: GameMode
  startLife: number
  players: Player[]
  turnIdx: number
  viewIdx: number
  round: number
}

export type AnimKey = 'slide' | 'walk' | 'slash'

export interface Settings {
  soundOn: boolean
  animKey: AnimKey
}
