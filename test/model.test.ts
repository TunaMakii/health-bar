import { describe, it, expect } from 'vitest'
import {
  createGame,
  makePlayer,
  makeCmdBar,
  makeLifeBar,
  makeTokenBar,
  tokenBarFromCatalog,
  setMode,
  setLife,
  changePlayerCount,
  movePlayer,
  startGame,
  resetDuel,
  newGame,
  checkState,
  revive,
  aliveCount,
  nextAlive,
  stepPlayer,
  applyLife,
  stripDelta,
  changeBar,
  tokCtr,
  tokHp,
  tokCnt,
  tokPT,
  BARDEFS,
} from '../src/state/model'
import { TOKENS, tokenPower } from '../src/state/tokens'
import type { Bar, GameState } from '../src/state/types'

const bar = (partial: Partial<Bar> & { type: Bar['type'] }): Bar => ({
  name: partial.type,
  value: 0,
  max: 0,
  ...partial,
})

describe('start-of-game fill rules', () => {
  it('fills life/extra/commander to full and zeroes poison/energy/custom', () => {
    const g = createGame()
    const p = g.players[0]
    p.bars[0].value = 12 // damaged life
    p.bars[1].value = 5 // damaged commander
    p.bars.push(bar({ type: 'extra', name: 'Extra', value: 3, max: 40 }))
    p.bars.push(bar({ type: 'poison', name: 'Poison', value: 4, max: 10 }))
    p.bars.push(bar({ type: 'energy', name: 'Energy', value: 7, max: 20 }))
    p.bars.push(bar({ type: 'custom', name: 'Storm', value: 6, max: 10 }))
    startGame(g)
    expect(p.bars[0].value).toBe(40) // life full
    expect(p.bars[1].value).toBe(21) // commander full
    expect(p.bars[2].value).toBe(40) // extra full
    expect(p.bars[3].value).toBe(0) // poison empty
    expect(p.bars[4].value).toBe(0) // energy empty
    expect(p.bars[5].value).toBe(0) // custom empty
  })

  it('leaves token squads at their configured state', () => {
    const g = createGame()
    const tok = makeTokenBar('Zombie', 2, 2)
    tok.count = 5
    g.players[0].bars.push(tok)
    startGame(g)
    expect(tok.value).toBe(2)
    expect(tok.count).toBe(5)
  })

  it('resets turn, view and round', () => {
    const g = createGame()
    g.turnIdx = 2
    g.viewIdx = 3
    g.round = 7
    startGame(g)
    expect(g.turnIdx).toBe(0)
    expect(g.viewIdx).toBe(0)
    expect(g.round).toBe(1)
  })
})

describe('game modes', () => {
  it('normal mode = 20 life, no commander bar', () => {
    const g = createGame()
    setMode(g, 'normal')
    expect(g.startLife).toBe(20)
    g.players.forEach((p) => {
      expect(p.bars[0].value).toBe(20)
      expect(p.bars.some((b) => b.type === 'cmd')).toBe(false)
    })
  })

  it('commander mode = 40 life + auto commander bar per player', () => {
    const g = createGame()
    setMode(g, 'normal')
    setMode(g, 'commander')
    expect(g.startLife).toBe(40)
    g.players.forEach((p) => {
      expect(p.bars[0].value).toBe(40)
      expect(p.bars.filter((b) => b.type === 'cmd').length).toBe(1)
    })
  })

  it('custom starting life applies to life + extra bars only', () => {
    const g = createGame()
    g.players[0].bars.push(bar({ type: 'extra', name: 'Extra', value: 40, max: 40 }))
    g.players[0].bars.push(makeCmdBar())
    setLife(g, 25)
    expect(g.players[0].bars[0].value).toBe(25) // life
    expect(g.players[0].bars[0].max).toBe(25)
    const extra = g.players[0].bars.find((b) => b.type === 'extra')!
    expect(extra.value).toBe(25)
    const cmd = g.players[0].bars.find((b) => b.type === 'cmd')!
    expect(cmd.max).toBe(21) // commander untouched
  })
})

describe('player count + ordering', () => {
  it('caps count between 1 and 6', () => {
    const g = createGame()
    while (g.players.length < 6) changePlayerCount(g, 1)
    expect(changePlayerCount(g, 1)).toBe(false)
    expect(g.players.length).toBe(6)
    while (g.players.length > 1) changePlayerCount(g, -1)
    expect(changePlayerCount(g, -1)).toBe(false)
    expect(g.players.length).toBe(1)
  })

  it('new players default to an unused mono colour', () => {
    const g = createGame()
    g.players = [makePlayer(1, ['W'], 'commander', 40)]
    changePlayerCount(g, 1)
    expect(g.players[1].colors).toEqual(['U']) // W taken → next free mono
  })

  it('swaps two seats', () => {
    const g = createGame()
    const a = g.players[0]
    const b = g.players[1]
    movePlayer(g, 0, 1)
    expect(g.players[0]).toBe(b)
    expect(g.players[1]).toBe(a)
  })
})

describe('death + resurrection', () => {
  it('main life at 0 kills; resurrect restores life to 1', () => {
    const g = createGame()
    g.players[0].bars[0].value = 0
    expect(checkState(g, 0)).toBe(true)
    expect(g.players[0].dead).toBe(true)
    revive(g, 0)
    expect(g.players[0].dead).toBe(false)
    expect(g.players[0].bars[0].value).toBe(1)
  })

  it('any commander-health bar at 0 kills; resurrect restores it to 1', () => {
    const g = createGame()
    const cmd = g.players[0].bars[1]
    cmd.value = 0
    expect(checkState(g, 0)).toBe(true)
    expect(g.players[0].dead).toBe(true)
    revive(g, 0)
    expect(cmd.value).toBe(1)
    expect(g.players[0].dead).toBe(false)
  })

  it('poison at max (10) kills; resurrect backs poison off to max-1', () => {
    const g = createGame()
    g.players[0].bars.push(bar({ type: 'poison', name: 'Poison', value: 10, max: 10 }))
    expect(checkState(g, 0)).toBe(true)
    expect(g.players[0].dead).toBe(true)
    revive(g, 0)
    const poison = g.players[0].bars.find((b) => b.type === 'poison')!
    expect(poison.value).toBe(9)
    expect(g.players[0].dead).toBe(false)
  })

  it('checkState only reports a NEW death once', () => {
    const g = createGame()
    g.players[0].bars[0].value = 0
    expect(checkState(g, 0)).toBe(true)
    expect(checkState(g, 0)).toBe(false) // already dead
  })
})

describe('commander health is independent of life', () => {
  it('changing commander never moves life, and clamps to [0,21]', () => {
    const g = createGame()
    const p = g.players[0]
    const life0 = p.bars[0].value
    const cmd = p.bars[1]

    changeBar(cmd, -5)
    expect(cmd.value).toBe(16)
    expect(p.bars[0].value).toBe(life0) // life untouched

    changeBar(cmd, +50) // clamp at max 21
    expect(cmd.value).toBe(21)
    expect(p.bars[0].value).toBe(life0)

    changeBar(cmd, -50) // clamp at 0
    expect(cmd.value).toBe(0)
    expect(p.bars[0].value).toBe(life0)
  })

  it('panel −/+ on commander also clamps to [0,max] without touching life', () => {
    const g = createGame()
    const p = g.players[0]
    const life0 = p.bars[0].value
    const cmd = p.bars[1]
    cmd.value = 1
    stripDelta(cmd, -1) // → 0
    expect(cmd.value).toBe(0)
    stripDelta(cmd, -1) // stays 0
    expect(cmd.value).toBe(0)
    expect(p.bars[0].value).toBe(life0)
  })

  it('changing life never moves commander', () => {
    const g = createGame()
    const p = g.players[0]
    const cmd0 = p.bars[1].value
    applyLife(p, -7)
    expect(p.bars[0].value).toBe(33)
    expect(p.bars[1].value).toBe(cmd0)
  })
})

describe('token squad math', () => {
  it('+1/+1 raises power AND toughness (max); −1/−1 lowers both', () => {
    const b = makeTokenBar('Beast', 3, 3)
    expect(tokPT(b)).toBe('3/3')
    tokCtr(b, 1)
    expect(tokPT(b)).toBe('4/4')
    expect(b.max).toBe(4)
    tokCtr(b, -1)
    tokCtr(b, -1)
    expect(tokPT(b)).toBe('2/2')
    expect(b.max).toBe(2)
  })

  it('hp damage lowers toughness only, not power', () => {
    const b = makeTokenBar('Beast', 3, 3)
    tokHp(b, -1)
    expect(tokPT(b)).toBe('3/2') // power 3, toughness 2
    expect(b.max).toBe(3) // max unchanged by hp damage
  })

  it('count adjusts number of copies, clamped [0,99]', () => {
    const b = makeTokenBar('Soldier', 1, 1)
    b.count = 1
    tokCnt(b, 3)
    expect(b.count).toBe(4)
    tokCnt(b, -100)
    expect(b.count).toBe(0)
  })

  it('artifact tokens derive power 0 from the catalogue', () => {
    const treasure = TOKENS.find((t) => t[0] === 'Treasure')!
    expect(tokenPower(treasure)).toBe(0)
    const idx = TOKENS.indexOf(treasure)
    const b = tokenBarFromCatalog(idx)
    expect(tokPT(b)).toBe('0/1')
  })

  it('X/X tokens derive power from hp', () => {
    const hydra = TOKENS.find((t) => t[0] === 'Hydra')!
    expect(tokenPower(hydra)).toBe(1)
  })
})

describe('token auto-delete', () => {
  it('removes a squad whose toughness hits 0', () => {
    const g = createGame()
    const b = makeTokenBar('Bird', 1, 1)
    g.players[0].bars.push(b)
    expect(tokHp(b, -1)).toBe(true) // died
    checkState(g, 0)
    expect(g.players[0].bars.includes(b)).toBe(false)
  })

  it('removes a squad whose count hits 0', () => {
    const g = createGame()
    const b = makeTokenBar('Soldier', 1, 1)
    b.count = 1
    g.players[0].bars.push(b)
    expect(tokCnt(b, -1)).toBe(true)
    checkState(g, 0)
    expect(g.players[0].bars.includes(b)).toBe(false)
  })

  it('killing a token does NOT kill the player', () => {
    const g = createGame()
    const b = makeTokenBar('Bird', 1, 1)
    g.players[0].bars.push(b)
    tokHp(b, -1)
    checkState(g, 0)
    expect(g.players[0].dead).toBe(false)
  })
})

describe('turn cycling + round counting', () => {
  const four = (): GameState => {
    const g = createGame()
    g.turnIdx = 0
    g.viewIdx = 0
    g.round = 1
    return g
  }

  it('advances to the next living player, skipping the dead', () => {
    const g = four()
    g.players[1].dead = true
    const r = stepPlayer(g, 1)
    expect(r.moved).toBe(true)
    expect(g.viewIdx).toBe(2) // skipped dead index 1
    expect(g.round).toBe(1)
  })

  it('wrapping forward past the last player increments the round', () => {
    const g = four()
    g.viewIdx = 3
    g.turnIdx = 3
    stepPlayer(g, 1)
    expect(g.viewIdx).toBe(0)
    expect(g.round).toBe(2)
  })

  it('wrapping backward decrements the round, floored at 1', () => {
    const g = four()
    g.viewIdx = 0
    g.turnIdx = 0
    g.round = 3
    stepPlayer(g, -1)
    expect(g.viewIdx).toBe(3)
    expect(g.round).toBe(2)
    // now floor: go back to 0 then wrap again
    g.viewIdx = 0
    g.round = 1
    stepPlayer(g, -1)
    expect(g.round).toBe(1) // never below 1
  })

  it('solo (1 player) cannot pass the turn', () => {
    const g = createGame()
    g.players = [g.players[0]]
    expect(stepPlayer(g, 1).moved).toBe(false)
  })

  it('aliveCount + nextAlive respect dead players', () => {
    const g = four()
    g.players[1].dead = true
    g.players[2].dead = true
    expect(aliveCount(g)).toBe(2)
    expect(nextAlive(g, 0)).toBe(3) // skips 1 and 2
  })
})

describe('reset operations', () => {
  it('resetDuel restores bars and clears deaths but keeps extra bars/tokens', () => {
    const g = createGame()
    const p = g.players[0]
    p.bars.push(makeTokenBar('Zombie', 2, 2))
    p.bars.push(bar({ type: 'poison', name: 'Poison', value: 8, max: 10 }))
    p.bars[0].value = 0
    checkState(g, 0)
    expect(p.dead).toBe(true)
    resetDuel(g)
    expect(p.dead).toBe(false)
    expect(p.bars[0].value).toBe(40)
    expect(p.bars.find((b) => b.type === 'poison')!.value).toBe(0)
    expect(p.bars.some((b) => b.type === 'token')).toBe(true) // tokens kept
  })

  it('newGame wipes to mode defaults, removing tokens + extra bars', () => {
    const g = createGame()
    const p = g.players[0]
    p.bars.push(makeTokenBar('Zombie', 2, 2))
    p.bars.push(bar({ type: 'poison', name: 'Poison', value: 3, max: 10 }))
    p.name = 'Keep Me'
    p.colors = ['U', 'B']
    newGame(g)
    expect(p.name).toBe('Keep Me') // names kept
    expect(p.colors).toEqual(['U', 'B']) // colors kept
    expect(p.bars.map((b) => b.type)).toEqual(['life', 'cmd']) // wiped to defaults
    expect(g.round).toBe(1)
  })
})

describe('factory sanity', () => {
  it('BARDEFS carry the spec maxes', () => {
    expect(BARDEFS.cmd.max).toBe(21)
    expect(BARDEFS.poison.max).toBe(10)
    expect(BARDEFS.energy.max).toBe(20)
  })
  it('makeLifeBar + makePlayer wire up correctly', () => {
    const lb = makeLifeBar(30)
    expect(lb).toMatchObject({ type: 'life', value: 30, max: 30 })
    const p = makePlayer(2, ['R'], 'commander', 40)
    expect(p.name).toBe('Player 2')
    expect(p.bars.map((b) => b.type)).toEqual(['life', 'cmd'])
  })
})
