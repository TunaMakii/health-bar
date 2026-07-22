/**
 * The live app store — a single mutable game + settings, restored from
 * localStorage on boot and re-saved after every mutation via persist().
 */
import { createGame } from './model'
import { load, save } from './persistence'
import type { GameState, Settings } from './types'

interface Store {
  game: GameState
  settings: Settings
}

const defaults = (): Store => ({
  game: createGame(),
  settings: { soundOn: true, animKey: 'slash' },
})

export const store: Store = defaults()

/** hydrate from localStorage; returns true if a saved game was restored */
export function hydrate(): boolean {
  const saved = load()
  if (!saved) return false
  store.game = saved.game
  store.settings = saved.settings
  return true
}

/** save the current state — call after every mutation */
export function persist(): void {
  save({ game: store.game, settings: store.settings })
}
