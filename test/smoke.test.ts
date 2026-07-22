// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { store } from '../src/state/store'

// each test boots a fresh app into a clean document
async function freshBoot() {
  localStorage.clear()
  document.body.innerHTML = '<div id="app"></div>'
  const { boot } = await import('../src/ui/app')
  boot()
  return (window as unknown as { HB: Record<string, (...a: unknown[]) => unknown> }).HB
}

const q = (sel: string) => document.querySelector(sel)

describe('app boots and renders every screen without crashing', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the setup screen on a cold boot', async () => {
    const HB = await freshBoot()
    expect(HB).toBeTruthy()
    expect(q('#scr-setup.active')).toBeTruthy()
    expect(document.querySelector('.logo')?.textContent).toContain('Health Bar')
    expect(document.querySelectorAll('.prow').length).toBe(4) // four default players
  })

  it('runs a full battlefield flow: start, damage, tokens, view-switch, detail, keypad', async () => {
    const HB = await freshBoot()

    // begin the duel → battlefield
    HB.startGame()
    expect(q('#scr-game.active')).toBeTruthy()
    expect(q('.mainwrap .panel')).toBeTruthy()

    // life tap surgically updates the number + fill
    const life0 = store.game.players[0].bars[0].value
    HB.tapLife(0, -1)
    expect(store.game.players[0].bars[0].value).toBe(life0 - 1)
    expect(document.querySelector('#life-0')?.textContent).toBe(String(life0 - 1))
    expect(q('.pend')).toBeTruthy() // pending badge appeared

    // commander pool strip: independent of life
    const cmdIdx = store.game.players[0].bars.findIndex((b) => b.type === 'cmd')
    const life1 = store.game.players[0].bars[0].value
    HB.tapStrip(0, cmdIdx, -1)
    expect(store.game.players[0].bars[cmdIdx].value).toBe(20)
    expect(store.game.players[0].bars[0].value).toBe(life1) // life untouched

    // switch view via a rail chip (exercises capture + playAnim, incl. Combat Slash)
    HB.chipTap(2)
    expect(store.game.viewIdx).toBe(2)
    expect(q('.mainwrap .panel')).toBeTruthy()

    // add a token through the detail → add-bar → token picker
    HB.openDetail(0)
    expect(q('#scr-detail.active')).toBeTruthy()
    HB.openAddBar(0, 'detail')
    HB.addBar('token')
    expect(q('#ovl-tokenpick.open')).toBeTruthy()
    const angel = 9 // catalogue index of Angel 4/4
    HB.addToken(angel)
    expect(store.game.players[0].bars.some((b) => b.type === 'token')).toBe(true)

    // token editor math on the battlefield
    HB.show('game')
    HB.chipTap(0)
    const tokIdx = store.game.players[0].bars.findIndex((b) => b.type === 'token')
    HB.openTokEdit(0, tokIdx)
    expect(q('.tokedit')).toBeTruthy()
    HB.tokCtr(1) // +1/+1 → 5/5
    const tb = store.game.players[0].bars[tokIdx]
    expect(tb.value).toBe(5)
    expect((tb.power || 0) + (tb.counters || 0)).toBe(5)

    // keypad on the commander bar
    HB.openDetail(0)
    HB.openKeypad(cmdIdx)
    expect(q('#ovl-keypad.open')).toBeTruthy()
    HB.kpDigit(9)
    HB.kpApply()
    expect(q('#ovl-keypad.open')).toBeFalsy()

    // reset + new game land back on setup
    HB.show('game')
    HB.doReset()
    expect(store.game.players[0].bars[0].value).toBe(40)
    HB.newGame()
    expect(q('#scr-setup.active')).toBeTruthy()
    expect(store.game.players[0].bars.every((b) => b.type === 'life' || b.type === 'cmd')).toBe(true)
  })

  it('persists to localStorage and resumes the battlefield on the next boot', async () => {
    let HB = await freshBoot()
    HB.startGame()
    HB.tapLife(0, -3)
    expect(localStorage.getItem('healthbar.v1')).toBeTruthy()

    // simulate a refresh: re-boot without clearing storage
    document.body.innerHTML = '<div id="app"></div>'
    const mod = await import('../src/ui/app')
    mod.boot()
    HB = (window as unknown as { HB: Record<string, (...a: unknown[]) => unknown> }).HB
    expect(q('#scr-game.active')).toBeTruthy() // resumed mid-game
    expect(store.game.players[0].bars[0].value).toBe(37) // damage survived the refresh
  })

  it('solo mode uses a full-bleed board with no rail', async () => {
    const HB = await freshBoot()
    HB.chgCount(-1)
    HB.chgCount(-1)
    HB.chgCount(-1) // 4 → 1
    expect(store.game.players.length).toBe(1)
    HB.startGame()
    expect(q('.game.bleedmode')).toBeTruthy()
    expect(q('.siderail')).toBeFalsy() // no rail in solo
  })
})
