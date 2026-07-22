/** localStorage persistence — the whole game + settings, saved on every mutation. */
import type { GameState, Settings } from './types'

const KEY = 'healthbar.v1'

export interface Persisted {
  game: GameState
  settings: Settings
}

/** restore a saved game, or null if nothing valid is stored */
export function load(): Persisted | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Persisted
    // minimal shape validation — a corrupt blob must not brick the app
    if (
      !data ||
      !data.game ||
      !Array.isArray(data.game.players) ||
      data.game.players.length < 1 ||
      !data.game.players.every((p) => Array.isArray(p.bars) && p.bars.length >= 1)
    ) {
      return null
    }
    // fill any newly-added settings so old saves keep working
    const s = data.settings || ({} as Partial<Settings>)
    data.settings = { soundOn: s.soundOn ?? true, animKey: s.animKey ?? 'slash' }
    return data
  } catch {
    return null
  }
}

export function save(p: Persisted): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* private mode / quota — the app still works in memory */
  }
}

export function clearSaved(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
