/**
 * app.ts — the view layer + interaction controller. Ports the prototype's
 * screens, handlers and gestures onto the tested state model in src/state.
 *
 * Inline template handlers (onclick/onpointerup) run in global scope, so the
 * controller is exposed as `window.HB`. All model mutations go through helpers
 * that persist() to localStorage and re-render.
 */
import { store, persist, hydrate } from '../state/store'
import * as M from '../state/model'
import type { Bar, GameState, ManaKey, Player } from '../state/types'
import { TOKENS } from '../state/tokens'
import { MANA, COLOR_ORDER, injectManaDefs } from './manaSymbols'
import { colorsName, canonicalColors, dotStyle, frameGrad, fillGrad, idBadgeHTML } from './colors'
import { STRIPMETA } from './barMeta'
import { ICON, icon } from './icons'
import { $, esc } from './dom'
import { snd } from './sound'
import { askFields } from './dialog'
import { ANIMS, captureSnapshot, playAnim } from './animations'
import { setWake } from './wakelock'

/* ───────── UI state ───────── */
type Screen = 'setup' | 'edit' | 'game' | 'detail'
let curScreen: Screen = 'setup'
let editIdx = 0
let editReturn: 'setup' | 'game' | 'detail' = 'setup'
let detailIdx = 0
let rearrange = false
let swapSel: number | null = null
let tokCtx: { i: number; bi: number } | null = null
let barCtx: { idx: number; from: 'edit' | 'detail' } | null = null
let kpCtx: { p: number; b: number } | null = null
let kpSign = -1
let kpDigits = ''
const pendTimers = new WeakMap<Player, ReturnType<typeof setTimeout>>()

/* ───────── small helpers ───────── */
const G = (): GameState => store.game
const clamp = M.clamp
function commit(): void {
  persist()
}

/* responsive: fluid sizing is always on (device-fit); large slates get device-tablet */
function isTablet(): boolean {
  return Math.min(window.innerWidth, window.innerHeight) >= 600
}
function isWide(): boolean {
  return isTablet() || window.innerWidth > window.innerHeight
}
function updateDeviceClasses(): void {
  document.body.classList.add('device-fit')
  document.body.classList.toggle('device-tablet', isTablet())
}

function openOvl(id: string): void {
  document.querySelectorAll('.ovl').forEach((o) => o.classList.remove('open'))
  $(id)?.classList.add('open')
}
function closeOvl(): void {
  document.querySelectorAll('.ovl').forEach((o) => o.classList.remove('open'))
}

function show(name: Screen): void {
  curScreen = name
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'))
  $('scr-' + name)?.classList.add('active')
  setWake(name === 'game') // hold the screen awake only during a game
  if (name === 'setup') renderSetup()
  if (name === 'edit') renderEdit()
  if (name === 'game') renderGame()
  if (name === 'detail') renderDetail()
}

/* ───────── setup screen ───────── */
function renderSetup(): void {
  const g = G()
  const presets = [20, 30, 40]
  const modeRow = `
    <div class="chip ${g.mode === 'normal' ? 'sel' : ''}" onclick="HB.setMode('normal')">NORMAL<span class="csub">20 life</span></div>
    <div class="chip ${g.mode === 'commander' ? 'sel' : ''}" onclick="HB.setMode('commander')">COMMANDER<span class="csub">40 life · cmd bar</span></div>`
  const lifeRow =
    presets.map((v) => `<div class="chip ${g.startLife === v ? 'sel' : ''}" onclick="HB.setLife(${v})">${v}</div>`).join('') +
    `<div class="chip ${!presets.includes(g.startLife) ? 'sel' : ''}" onclick="HB.customLife()">${
      !presets.includes(g.startLife) ? g.startLife : '···'
    }</div>`
  const plist = g.players
    .map((p, i) => {
      const extra = p.bars.length - 1
      return `<div class="prow" onclick="HB.openEdit(${i},'setup')">
        <div style="display:flex;flex-direction:column;gap:3px">
          <div class="ordbtn ${i === 0 ? 'dis' : ''}" onclick="event.stopPropagation();HB.movePlayer(${i},-1)" aria-label="Move up">${icon(ICON.chevUp, 'icon icon-sm')}</div>
          <div class="ordbtn ${i === g.players.length - 1 ? 'dis' : ''}" onclick="event.stopPropagation();HB.movePlayer(${i},1)" aria-label="Move down">${icon(ICON.chevDown, 'icon icon-sm')}</div>
        </div>
        <div class="gdot" style="${dotStyle(p.colors)}"></div>
        <div style="flex:1;min-width:0">
          <div class="pname">${esc(p.name)}</div>
          <div class="pbars">${extra > 0 ? extra + ' extra bar' + (extra > 1 ? 's' : '') : 'life only'}</div>
        </div>
        <div class="pcolor">${colorsName(p.colors)}</div>
        ${icon(ICON.chevRight, 'icon icon-sm')}
      </div>`
    })
    .join('')

  $('scr-setup')!.innerHTML = `
    <div class="setup" style="position:relative">
      <div class="iconbtn" style="position:absolute;top:2px;right:12px;z-index:2" onclick="HB.openSettings()" aria-label="Settings" title="Settings">${icon(ICON.gear)}</div>
      <div>
        <div class="logo">Health Bar</div>
        <div class="logodeco">
          <div class="line"></div>
          <div class="mana m-sm" style="background:var(--mr)"><svg><use href="#sy-r"/></svg></div>
          <div class="line r"></div>
        </div>
      </div>
      <div>
        <div class="label">Game Mode</div>
        <div class="row">${modeRow}</div>
      </div>
      <div class="row" style="align-items:flex-end">
        <div style="flex:1">
          <div class="label">Planeswalkers</div>
          <div class="stepper">
            <div class="stepbtn" onclick="HB.chgCount(-1)" aria-label="Fewer players">${icon(ICON.minus)}</div>
            <div class="stepval" id="pcount">${g.players.length}</div>
            <div class="stepbtn" onclick="HB.chgCount(1)" aria-label="More players">${icon(ICON.plus)}</div>
          </div>
        </div>
      </div>
      <div>
        <div class="label">Starting Life</div>
        <div class="row">${lifeRow}</div>
      </div>
      <div style="flex:1">
        <div class="label">The Table</div>
        <div class="players">${plist}</div>
      </div>
      <div class="cta" onclick="HB.startGame()">⚔ &nbsp;BEGIN THE DUEL&nbsp; ⚔</div>
    </div>`
}

function setMode(m: 'normal' | 'commander'): void {
  M.setMode(G(), m)
  commit()
  renderSetup()
}
function setLife(v: number): void {
  M.setLife(G(), v)
  commit()
  renderSetup()
}
async function customLife(): Promise<void> {
  const r = await askFields('Starting Life', [{ label: 'Life total', type: 'number', value: '25', min: 1 }])
  const v = r && parseInt(r[0])
  if (v && v > 0) setLife(v)
}
function chgCount(d: number): void {
  M.changePlayerCount(G(), d)
  commit()
  renderSetup()
}
function movePlayer(i: number, d: number): void {
  M.movePlayer(G(), i, d)
  commit()
  renderSetup()
}
function startGame(): void {
  M.startGame(G())
  rearrange = false
  swapSel = null
  tokCtx = null
  commit()
  show('game')
}

/* ───────── edit planeswalker ───────── */
function openEdit(i: number, ret: 'setup' | 'game' | 'detail'): void {
  editIdx = i
  editReturn = ret
  show('edit')
}
function closeEdit(): void {
  if (editReturn === 'game') {
    G().viewIdx = editIdx
    commit()
    show('game')
    return
  }
  show(editReturn === 'detail' ? 'detail' : 'setup')
}
function renderEdit(): void {
  const p = G().players[editIdx]
  const bars = p.bars
    .map((b, bi) => {
      const isLife = b.type === 'life'
      return `<div class="barrow">
        <div class="bn">${esc(b.name)}${b.type === 'token' ? ' ×' + b.count : ''}</div>
        <div class="bv">${b.type === 'token' ? `${M.tokPT(b)} ×${b.count}` : `${b.value} / ${b.max}`}</div>
        ${
          !isLife
            ? `<div class="del" style="color:#6b5527" onclick="HB.renameBarE(${bi})" aria-label="Rename bar">${icon(ICON.pencil, 'icon icon-sm')}</div>
               <div class="del" onclick="HB.delBarE(${bi})" aria-label="Delete bar">${icon(ICON.trash, 'icon icon-sm')}</div>`
            : ''
        }
      </div>`
    })
    .join('')

  $('scr-edit')!.innerHTML = `
    <div class="appbar">
      <div class="iconbtn" onclick="HB.closeEdit()" aria-label="Back">${icon(ICON.back)}</div>
      <div class="title">${esc(p.name)}</div>
    </div>
    <div class="picker">
      <div>
        <div class="label">Name</div>
        <input class="nameinput" value="${esc(p.name)}" maxlength="14" onchange="HB.editName(this.value)">
      </div>
      <div>
        <div class="label">Colors</div>
        <div class="manarow">${COLOR_ORDER.map(
          (c) =>
            `<div class="mana m-lg ${p.colors.includes(c) ? 'sel' : ''}" style="background:${MANA[c].circle};cursor:pointer" onclick="HB.toggleColor('${c}')" aria-label="${c}"><svg><use href="#${MANA[c].sym}"/></svg></div>`,
        ).join('')}</div>
        <div class="colorprev">
          <div class="gdot" style="width:22px;height:22px;${dotStyle(p.colors)}"></div>
          <div class="cpbar"><div style="height:100%;border-radius:99px;background:${fillGrad(p.colors)}"></div></div>
          <div class="cpname">${colorsName(p.colors)}</div>
        </div>
        <div class="pickhint">tap symbols to mix any combination — all five for Rainbow</div>
      </div>
      <div>
        <div class="label">Bars</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${bars}
          <div class="addbar" onclick="HB.openAddBar(${editIdx},'edit')">${icon(ICON.plus)} SUMMON ANOTHER BAR</div>
        </div>
      </div>
      <div class="cta" onclick="HB.closeEdit()">DONE</div>
    </div>`
}
function editName(v: string): void {
  const p = G().players[editIdx]
  p.name = v.trim().slice(0, 14) || p.name
  commit()
  renderEdit()
}
function toggleColor(c: ManaKey): void {
  const p = G().players[editIdx]
  let cs = p.colors.slice()
  if (c === 'C') cs = ['C']
  else {
    cs = cs.filter((x) => x !== 'C')
    if (cs.includes(c)) {
      if (cs.length > 1) cs = cs.filter((x) => x !== c) // never drop below one colour
    } else cs.push(c)
  }
  p.colors = canonicalColors(cs)
  commit()
  renderEdit()
}

/* ───────── add bar (shared by edit + detail) ───────── */
function openAddBar(idx: number, from: 'edit' | 'detail'): void {
  barCtx = { idx, from }
  openOvl('ovl-addbar')
}
async function addBar(type: string): Promise<void> {
  if (!barCtx) return
  if (type === 'token') {
    ;($('toksearch') as HTMLInputElement).value = ''
    renderTokenList('')
    openOvl('ovl-tokenpick')
    return
  }
  const p = G().players[barCtx.idx]
  if (type === 'custom') {
    const r = await askFields('Custom Counter', [
      { label: 'Counter name', value: 'Loyalty', maxlength: 20 },
      { label: 'Counts up to (full at)', type: 'number', value: '10', min: 1 },
    ])
    if (!r || !r[0]) return
    const mx = parseInt(r[1])
    p.bars.push({ type: 'custom', name: r[0].slice(0, 20), value: 0, max: mx > 0 ? mx : 10 })
  } else if (type === 'extra') {
    p.bars.push({
      type: 'extra',
      name: 'Health Bar ' + (p.bars.filter((b) => b.type === 'life' || b.type === 'extra').length + 1),
      value: G().startLife,
      max: G().startLife,
    })
  } else if (type === 'cmd' || type === 'poison' || type === 'energy') {
    p.bars.push({ type, ...M.BARDEFS[type] })
  }
  closeOvl()
  commit()
  barCtx.from === 'edit' ? renderEdit() : renderDetail()
}
function renderTokenList(q: string): void {
  q = (q || '').trim().toLowerCase()
  const hits = TOKENS.map((t, i) => ({ t, i })).filter((x) => !q || x.t[0].toLowerCase().includes(q))
  $('toklist')!.innerHTML =
    `<div class="tokrow" onclick="HB.addCustomToken()"><div class="tn">Custom Token…</div><div class="tp">name it yourself</div></div>` +
    hits.map((x) => `<div class="tokrow" onclick="HB.addToken(${x.i})"><div class="tn">${esc(x.t[0])}</div><div class="tp">${x.t[1]}</div></div>`).join('') +
    (hits.length ? '' : `<div style="text-align:center;font-style:italic;color:var(--fg-dim);padding:8px">No token found — use Custom Token</div>`)
}
function pushToken(bar: Bar): void {
  if (!barCtx) return
  G().players[barCtx.idx].bars.push(bar)
  closeOvl()
  commit()
  barCtx.from === 'edit' ? renderEdit() : renderDetail()
}
function addToken(i: number): void {
  pushToken(M.tokenBarFromCatalog(i))
}
async function addCustomToken(): Promise<void> {
  const r = await askFields('Custom Token', [
    { label: 'Token name', value: 'Token', maxlength: 20 },
    { label: 'Token toughness', type: 'number', value: '1', min: 0 },
  ])
  if (!r || !r[0]) return
  const hp = parseInt(r[1]) || 1
  pushToken(M.makeTokenBar(r[0].slice(0, 20), hp))
}

/* ───────── game — turn-based single view ───────── */
function renderGame(): void {
  const g = G()
  const players = g.players
  const grid = $('grid')!
  const solo1 = players.length === 1
  grid.classList.toggle('bleedmode', !isWide() || solo1)
  $('btn-arr')?.classList.toggle('on', rearrange)

  const hint = $('hint')!
  if (rearrange) {
    hint.textContent = 'SWAP SEATS — tap two names to trade turn order'
    hint.classList.add('warn')
  } else if (solo1) {
    hint.textContent = 'tap sides: −1/+1 · hold: menu · bottom tab: tools'
    hint.classList.remove('warn')
  } else {
    hint.textContent = 'swipe left: next · swipe right: previous · tap sides: −1/+1 · hold: menu · bottom tab: tools'
    hint.classList.remove('warn')
  }

  if (g.viewIdx >= players.length) g.viewIdx = players.length - 1
  if (g.turnIdx >= players.length) g.turnIdx = players.length - 1

  const chips = solo1
    ? ''
    : `<div class="siderail"><div class="roundtag">R${g.round}</div>` +
      players
        .map((p, i) => {
          const cls = ['pchip', i === g.turnIdx ? 'turn' : '', i === g.viewIdx ? 'view' : '', p.dead ? 'deadc' : '', rearrange && swapSel === i ? 'swapsel' : '']
            .filter(Boolean)
            .join(' ')
          return `<div class="${cls}" style="--pcgrad:${fillGrad(p.colors)}" onclick="HB.chipTap(${i})">
            <div class="top">
              <div class="gdot" style="width:11px;height:11px;${dotStyle(p.colors)}"></div>
              <span class="nm">${esc(p.name)}</span>
            </div>
            ${p.dead ? `<svg class="chipskull" viewBox="0 0 24 24"><use href="#sy-b"/></svg>` : `<span class="lv">${p.bars[0].value}</span>`}
          </div>`
        })
        .join('') +
      `</div>`

  const idx = g.viewIdx
  const p = players[idx]
  const cols = p.colors
  const lb = p.bars[0]
  const pct = clamp((lb.value / lb.max) * 100, 0, 100)

  let strips = ''
  let tokItems = ''
  let cmdpools = ''
  p.bars.forEach((b, bi) => {
    if (bi === 0) return
    if (b.type === 'cmd') {
      const pctC = clamp((b.value / b.max) * 100, 0, 100)
      cmdpools += `<div class="pooldiv"></div>
        <div class="pool cmd">
          <div class="poolname">${esc(b.name)}</div>
          <div class="poolrow">
            <div class="pbtn" onpointerdown="event.stopPropagation()" onpointerup="event.stopPropagation();HB.tapStrip(${idx},${bi},-1)">−</div>
            <div class="cmdval" id="sv-${idx}-${bi}">${b.value}</div>
            <div class="pbtn" onpointerdown="event.stopPropagation()" onpointerup="event.stopPropagation();HB.tapStrip(${idx},${bi},1)">+</div>
          </div>
          <div class="bar cmdbar"><div class="fill" id="sf-${idx}-${bi}" style="width:${pctC}%;background:${STRIPMETA.cmd!.grad}"></div></div>
        </div>`
      return
    }
    if (b.type === 'token') {
      const ctr = b.counters || 0
      tokItems += `<div class="tokitem" onpointerdown="event.stopPropagation()" onpointerup="event.stopPropagation();HB.openTokEdit(${idx},${bi})">
        <div class="tkname">${esc(b.name)}</div>
        <div class="tkstats"><span class="tkpt">${M.tokPT(b)}</span><span class="tkcnt">×${b.count}</span>
          <div class="tkbar"><div class="tkfill" style="width:${clamp((b.value / b.max) * 100, 0, 100)}%"></div></div>
          ${ctr ? `<span class="tkctr">${ctr > 0 ? '+' + ctr : ctr}</span>` : ''}
        </div>
      </div>`
      return
    }
    const m = STRIPMETA[b.type] || STRIPMETA.extra!
    const grad = m.grad || fillGrad(cols)
    const pctS = clamp((b.value / b.max) * 100, 0, 100)
    strips += `<div class="cmdstrip" onpointerdown="event.stopPropagation()" onpointerup="event.stopPropagation()">
      <div class="cbtn" onpointerup="event.stopPropagation();HB.tapStrip(${idx},${bi},-1)">−</div>
      <svg class="cicon" viewBox="0 0 24 24">${m.icon}</svg>
      <span class="cval" id="sv-${idx}-${bi}">${b.value}</span>
      <div class="cbar"><div class="cfill" id="sf-${idx}-${bi}" style="width:${pctS}%;background:${grad}"></div></div>
      <div class="cbtn" onpointerup="event.stopPropagation();HB.tapStrip(${idx},${bi},1)">+</div>
    </div>`
  })

  let tokedit = ''
  if (tokCtx && tokCtx.i === idx) {
    const b = p.bars[tokCtx.bi]
    if (b && b.type === 'token') {
      const ctr = b.counters || 0
      tokedit = `<div class="tokedit" onpointerdown="event.stopPropagation()" onpointerup="event.stopPropagation()">
        <div class="tehead">
          <div class="tename">${esc(b.name)}</div>
          <div class="teic" onclick="HB.tokRename()" aria-label="Rename token">${icon(ICON.pencil)}</div>
          <div class="teic" onclick="HB.closeTokEdit()" aria-label="Close">${icon(ICON.close)}</div>
        </div>
        <div class="tept">${M.tokPT(b)} <span>×${b.count}</span></div>
        <div class="tectr">${ctr === 0 ? 'no counters' : ctr > 0 ? '+' + ctr + '/+' + ctr + ' counters' : ctr + '/' + ctr + ' counters'}</div>
        <div class="tegrid">
          <div class="tb plus" onclick="HB.tokCtr(1)">+1/+1</div>
          <div class="tb minus" onclick="HB.tokCtr(-1)">−1/−1</div>
          <div class="tb minus" onclick="HB.tokHp(-1)">− hp</div>
          <div class="tb plus" onclick="HB.tokHp(1)">+ hp</div>
          <div class="tb minus" onclick="HB.tokCnt(-1)">− tok</div>
          <div class="tb plus" onclick="HB.tokCnt(1)">+ tok</div>
        </div>
        <div class="tedestroy" onclick="HB.tokDelete()">DESTROY</div>
      </div>`
    }
  }

  const nOther = 1 + p.bars.filter((b) => b.type !== 'life' && b.type !== 'token').length
  const dense = !isWide() && (nOther > 3 || (players.length > 4 && nOther > 2))
  const panelHtml = `<div class="panel solo ${tokItems ? 'hastok' : ''} ${tokedit ? 'editing' : ''} ${dense ? 'dense' : ''}"
      style="background:${frameGrad(cols)}" data-i="${idx}">
    <i class="pcor tl"></i><i class="pcor tr"></i><i class="pcor bl"></i><i class="pcor br"></i>
    ${p.pending ? `<div class="pend ${p.pending > 0 ? 'gain' : 'loss'}" id="pend-${idx}">${p.pending > 0 ? '+' : ''}${p.pending}</div>` : ''}
    <div class="titlebar">
      <div class="tname">${esc(p.name)}</div>
      ${idBadgeHTML(cols)}
      <div class="menubtn" onpointerdown="event.stopPropagation()" onpointerup="event.stopPropagation();HB.openDetail(${idx})" aria-label="Player menu">${icon(ICON.burger, 'icon icon-sm')}</div>
    </div>
    <div class="panelbody">
      <div class="pleft">
        <div class="lifewrap">
          <div class="pool">
            <div class="poolname">${esc(lb.name)}</div>
            <div class="poolrow">
              <div class="pbtn" onpointerdown="event.stopPropagation()" onpointerup="event.stopPropagation();HB.tapLife(${idx},-1)">−</div>
              <div class="life" id="life-${idx}">${lb.value}</div>
              <div class="pbtn" onpointerdown="event.stopPropagation()" onpointerup="event.stopPropagation();HB.tapLife(${idx},1)">+</div>
            </div>
            <div class="bar"><div class="gfill" id="gfill-${idx}" style="width:${pct}%"></div><div class="fill" id="fill-${idx}" style="width:${pct}%;background:${fillGrad(cols)}"></div></div>
          </div>
          ${cmdpools}
        </div>
        ${strips ? `<div class="strips">${strips}</div>` : ''}
      </div>
      ${tokItems ? `<div class="pright" onpointerdown="event.stopPropagation()" onpointerup="event.stopPropagation()"><div class="tkhead">TOKENS</div>${tokItems}</div>` : ''}
      ${tokedit}
    </div>
    ${
      p.dead
        ? `<div class="deadovl">
        <svg class="skull" viewBox="0 0 24 24"><use href="#sy-b"/></svg>
        <div class="deadtxt">YOU'VE LOST</div>
        <div class="revive" onpointerdown="event.stopPropagation()" onpointerup="event.stopPropagation();HB.revive(${idx})">RESURRECT</div>
      </div>`
        : ''
    }
  </div>`

  grid.innerHTML = chips + `<div class="mainwrap">${panelHtml}</div>`
  const pe = grid.querySelector('.panel') as HTMLElement | null
  if (pe) attachPanel(pe)
}

function chipTap(i: number): void {
  const g = G()
  if (rearrange) {
    if (swapSel === null) swapSel = i
    else if (swapSel !== i) {
      const tP = g.players[g.turnIdx]
      const vP = g.players[g.viewIdx]
      ;[g.players[swapSel], g.players[i]] = [g.players[i], g.players[swapSel]]
      g.turnIdx = g.players.indexOf(tP)
      g.viewIdx = g.players.indexOf(vP)
      swapSel = null
    } else swapSel = null
    commit()
    renderGame()
    return
  }
  const changed = g.viewIdx !== i
  if (changed) captureSnapshot(frameGrad(g.players[g.viewIdx].colors))
  tokCtx = null
  g.viewIdx = i
  commit()
  renderGame()
  if (changed) playAnim(store.settings.animKey)
}

function stepTurn(dir: number): void {
  const g = G()
  if (g.players.length < 2 || M.aliveCount(g) === 0) return
  captureSnapshot(frameGrad(g.players[g.viewIdx].colors))
  tokCtx = null
  const r = M.stepPlayer(g, dir)
  if (!r.moved) return
  snd('turn')
  commit()
  renderGame()
  playAnim(store.settings.animKey, dir)
}

function openDetail(i: number): void {
  if (rearrange) return
  detailIdx = i
  show('detail')
}

/* panel gestures: swipe = turn, tap-half = ±1, long-press = detail */
function attachPanel(el: HTMLElement): void {
  const i = +el.dataset.i!
  let timer: ReturnType<typeof setTimeout> | null = null
  let long = false
  let sx: number | null = null
  let sy = 0
  let dragging = false
  el.addEventListener('pointerdown', (e) => {
    long = false
    dragging = false
    sx = e.clientX
    sy = e.clientY
    if (!rearrange && !G().players[i].dead) timer = setTimeout(() => { long = true; openDetail(i) }, 450)
  })
  el.addEventListener('pointermove', (e) => {
    if (sx === null || rearrange) return
    const dx = e.clientX - sx
    const dy = e.clientY - sy
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) { if (timer) clearTimeout(timer) }
    if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy)) {
      dragging = true
      el.style.transition = 'none'
      el.style.transform = `translateX(${dx * 0.35}px)`
      el.style.opacity = String(1 - Math.min(0.35, Math.abs(dx) / 600))
    }
  })
  el.addEventListener('pointerup', (e) => {
    if (timer) clearTimeout(timer)
    const fdx = sx === null ? 0 : e.clientX - sx
    const fdy = sx === null ? 0 : e.clientY - sy
    sx = null
    if (long) return
    if (dragging) {
      el.style.transition = 'transform .18s ease-out,opacity .18s'
      el.style.transform = ''
      el.style.opacity = ''
      if (Math.abs(fdx) > 70 && Math.abs(fdx) > Math.abs(fdy) * 1.4) stepTurn(fdx < 0 ? 1 : -1) // left=next, right=prev
      return
    }
    if (rearrange) {
      const g = G()
      if (swapSel === null) swapSel = i
      else if (swapSel !== i) { [g.players[swapSel], g.players[i]] = [g.players[i], g.players[swapSel]]; swapSel = null }
      else swapSel = null
      commit()
      renderGame()
      return
    }
    if (G().players[i].dead) return
    const rect = (el.querySelector('.pleft') || el).getBoundingClientRect()
    const leftHalf = e.clientX - rect.left < rect.width / 2
    tapLife(i, leftHalf ? -1 : 1)
  })
  el.addEventListener('pointerleave', () => {
    if (timer) clearTimeout(timer)
    sx = null
    if (dragging) { dragging = false; el.style.transition = 'transform .18s ease-out,opacity .18s'; el.style.transform = ''; el.style.opacity = '' }
  })
}

/* ───────── life / strip / token mutations ───────── */
function tapLife(i: number, d: number): void {
  const g = G()
  const p = g.players[i]
  const lb = p.bars[0]
  snd(d < 0 ? 'down' : 'up')
  M.applyLife(p, d)
  const prev = pendTimers.get(p)
  if (prev) clearTimeout(prev)
  pendTimers.set(
    p,
    setTimeout(() => {
      p.pending = 0
      $('pend-' + i)?.remove()
      commit()
    }, 1400),
  )
  const lifeEl = $('life-' + i)
  if (lifeEl) {
    lifeEl.textContent = String(lb.value)
    lifeEl.classList.remove('bump')
    void lifeEl.offsetWidth
    lifeEl.classList.add('bump')
  }
  const w = clamp((lb.value / lb.max) * 100, 0, 100) + '%'
  const fillEl = $('fill-' + i) as HTMLElement | null
  if (fillEl) fillEl.style.width = w
  const gEl = $('gfill-' + i) as HTMLElement | null
  if (gEl) gEl.style.width = w
  let pendEl = $('pend-' + i)
  if (!pendEl) {
    pendEl = document.createElement('div')
    pendEl.id = 'pend-' + i
    document.querySelector(`.panel[data-i="${i}"]`)?.appendChild(pendEl)
  }
  pendEl.className = 'pend ' + (p.pending > 0 ? 'gain' : 'loss')
  pendEl.textContent = (p.pending > 0 ? '+' : '') + p.pending
  commit()
  if (lb.value <= 0) {
    if (M.checkState(g, i)) snd('death')
    renderGame()
  }
}
function tapStrip(i: number, bi: number, d: number): void {
  const g = G()
  if (rearrange || g.players[i].dead) return
  const b = g.players[i].bars[bi]
  if (!b) return
  const died = M.stripDelta(b, d)
  snd(d < 0 ? 'down' : 'up')
  commit()
  if (died) {
    if (M.checkState(g, i)) snd('death')
    renderGame()
    return
  }
  const v = $(`sv-${i}-${bi}`)
  const f = $(`sf-${i}-${bi}`) as HTMLElement | null
  if (v) v.textContent = b.type === 'token' ? `${M.tokPT(b)}×${b.count}` : String(b.value)
  if (f) f.style.width = clamp((b.value / b.max) * 100, 0, 100) + '%'
}

/* in-panel token editor */
function openTokEdit(i: number, bi: number): void {
  if (rearrange || G().players[i].dead) return
  tokCtx = tokCtx && tokCtx.i === i && tokCtx.bi === bi ? null : { i, bi }
  renderGame()
}
function closeTokEdit(): void {
  tokCtx = null
  renderGame()
}
function tokBar(): Bar | null {
  if (!tokCtx) return null
  return G().players[tokCtx.i]?.bars[tokCtx.bi] || null
}
function tokDied(): void {
  if (tokCtx) M.checkState(G(), tokCtx.i)
  tokCtx = null
  commit()
  renderGame()
}
function tokCtr(d: number): void {
  const b = tokBar()
  if (!b) return
  if (M.tokCtr(b, d)) return tokDied()
  commit()
  renderGame()
}
function tokHp(d: number): void {
  const b = tokBar()
  if (!b) return
  if (M.tokHp(b, d)) return tokDied()
  commit()
  renderGame()
}
function tokCnt(d: number): void {
  const b = tokBar()
  if (!b) return
  if (M.tokCnt(b, d)) return tokDied()
  commit()
  renderGame()
}
function tokDelete(): void {
  if (!tokCtx) return
  G().players[tokCtx.i].bars.splice(tokCtx.bi, 1)
  tokCtx = null
  commit()
  renderGame()
}
async function tokRename(): Promise<void> {
  const b = tokBar()
  if (!b) return
  const r = await askFields('Rename Token', [{ label: 'Token name', value: b.name, maxlength: 20 }])
  if (r && r[0]) b.name = r[0].slice(0, 20)
  commit()
  renderGame()
}

function toggleRearrange(): void {
  rearrange = !rearrange
  swapSel = null
  tokCtx = null
  renderGame()
}
function addPlayerLive(): void {
  const g = G()
  if (g.players.length >= 6) return
  g.players.push(M.makePlayer(g.players.length + 1, M.nextColors(g.players), g.mode, g.startLife))
  commit()
  openEdit(g.players.length - 1, 'game')
}
function revive(i: number): void {
  M.revive(G(), i)
  commit()
  renderGame()
}

/* ───────── tool drawer ───────── */
function setDrawer(v: boolean): void {
  $('sidedrawer')?.classList.toggle('open', v)
  const scrim = $('drawerscrim')
  if (scrim) scrim.style.display = v ? 'block' : 'none'
  const handle = $('drawerhandle')
  if (handle) handle.style.display = v ? 'none' : 'flex'
}
function toggleSound(): void {
  store.settings.soundOn = !store.settings.soundOn
  $('sndbtn')?.classList.toggle('off', !store.settings.soundOn)
  commit()
}

/* ───────── dice / reset / settings ───────── */
function rollDice(): void {
  const rolls = G().players.map((p) => ({ name: p.name, v: 1 + Math.floor(Math.random() * 20) }))
  const best = Math.max(...rolls.map((r) => r.v))
  $('dicelist')!.innerHTML = rolls
    .map(
      (r) =>
        `<div class="drow ${r.v === best ? 'win' : ''}"><b>${esc(r.name)}</b>${
          r.v === best ? '<span style="font-style:italic;color:var(--gold)">goes first</span>' : ''
        }<div class="dv">${r.v}</div></div>`,
    )
    .join('')
  openOvl('ovl-dice')
}
function doReset(): void {
  M.resetDuel(G())
  commit()
  closeOvl()
  renderGame()
}
function newGameAction(): void {
  M.newGame(G())
  rearrange = false
  swapSel = null
  tokCtx = null
  commit()
  closeOvl()
  show('setup')
}
function openSettings(): void {
  renderAnimRow()
  openOvl('ovl-settings')
}
function renderAnimRow(): void {
  $('animrow')!.innerHTML = ANIMS.map(
    (a) => `<div class="achip ${store.settings.animKey === a[0] ? 'sel' : ''}" onclick="HB.setAnim('${a[0]}')">${a[1]}</div>`,
  ).join('')
}
function setAnim(k: 'slide' | 'walk' | 'slash'): void {
  store.settings.animKey = k
  commit()
  renderAnimRow()
  if (curScreen === 'game') playAnim(k)
}

/* ───────── detail ───────── */
function renderDetail(): void {
  const g = G()
  const p = g.players[detailIdx]
  const cols = p.colors
  const deadBanner = p.dead
    ? `<div style="text-align:center;font-family:'Cinzel',serif;font-weight:900;letter-spacing:3px;color:#e8927c;border:1px solid #8a3324;border-radius:12px;padding:10px;background:rgba(60,15,10,.35)">YOU'VE LOST — resurrect from the battlefield</div>`
    : ''
  const bars = p.bars
    .map((b, bi) => {
      const pct = clamp((b.value / b.max) * 100, 0, 100)
      const ren = b.type !== 'life' ? `<div class="del" style="color:#6b5527" onclick="HB.renameBar(${bi})" aria-label="Rename bar">${icon(ICON.pencil, 'icon icon-sm')}</div>` : ''
      const del = b.type !== 'life' ? `<div class="del" onclick="HB.delBar(${bi})" aria-label="Delete bar">${icon(ICON.trash, 'icon icon-sm')}</div>` : ''
      const val = b.type === 'token' ? `<div class="pt">${M.tokPT(b)}<span class="den"> ×${b.count}</span></div>` : `<div class="pt">${b.value}<span class="den"> / ${b.max}</span></div>`
      let ctrl = ''
      if (b.type === 'life' || b.type === 'extra')
        ctrl = `<div class="b minus" onclick="HB.chgBar(${bi},-5)">−5</div><div class="b minus" onclick="HB.chgBar(${bi},-1)">−1</div><div class="b plus" onclick="HB.chgBar(${bi},1)">+1</div><div class="b plus" onclick="HB.chgBar(${bi},5)">+5</div><div class="b x" onclick="HB.openKeypad(${bi})">±X</div>`
      else if (b.type === 'token')
        ctrl = `<div class="b minus" onclick="HB.chgBar(${bi},-1)">− hp</div><div class="b plus" onclick="HB.chgBar(${bi},1)">+ hp</div><div class="b minus" onclick="HB.chgTok(${bi},-1)">− tok</div><div class="b plus" onclick="HB.chgTok(${bi},1)">+ tok</div>
          </div><div class="ctrl"><div class="b plus" onclick="HB.chgCtr(${bi},1)">+1/+1</div><div class="b minus" onclick="HB.chgCtr(${bi},-1)">−1/−1</div>`
      else ctrl = `<div class="b minus" onclick="HB.chgBar(${bi},-1)">−1</div><div class="b plus" onclick="HB.chgBar(${bi},1)">+1</div><div class="b x" onclick="HB.openKeypad(${bi})">±X</div>`
      return `<div class="cardbar" style="background:${frameGrad(cols)}">
        <div class="head">
          <div class="btitle"><div class="bname">${esc(b.name)}${b.type === 'token' ? ' ×' + b.count : ''}</div>${ren}${del}</div>${val}
        </div>
        <div class="track"><div class="fill" style="width:${pct}%;background:${fillGrad(cols)}"></div></div>
        <div class="ctrl">${ctrl}</div>
      </div>`
    })
    .join('')

  $('scr-detail')!.innerHTML = `
    <div class="appbar">
      <div class="iconbtn" onclick="HB.show('game')" aria-label="Back">${icon(ICON.back)}</div>
      <div class="title">${esc(p.name)}</div>
      ${idBadgeHTML(cols, 22)}
      <div class="spacer"></div>
      <div class="iconbtn" onclick="HB.openEdit(${detailIdx},'detail')" aria-label="Edit planeswalker">${icon(ICON.pencil)}</div>
    </div>
    <div class="detail">
      ${deadBanner}
      ${bars}
      <div class="addbar" onclick="HB.openAddBar(${detailIdx},'detail')">${icon(ICON.plus)} SUMMON ANOTHER BAR</div>
      <div style="text-align:center;font-style:italic;color:var(--fg-dim);font-size:12.5px">commander damage · poison · energy · tokens · extra health</div>
    </div>`
}
async function renameBar(bi: number): Promise<void> {
  const b = G().players[detailIdx].bars[bi]
  const r = await askFields('Rename Bar', [{ label: 'Bar name', value: b.name, maxlength: 20 }])
  if (r && r[0]) { b.name = r[0].slice(0, 20); commit(); renderDetail() }
}
async function renameBarE(bi: number): Promise<void> {
  const b = G().players[editIdx].bars[bi]
  const r = await askFields('Rename Bar', [{ label: 'Bar name', value: b.name, maxlength: 20 }])
  if (r && r[0]) { b.name = r[0].slice(0, 20); commit(); renderEdit() }
}
function delBarE(bi: number): void {
  G().players[editIdx].bars.splice(bi, 1)
  commit()
  renderEdit()
}
function chgBar(bi: number, d: number): void {
  const g = G()
  const b = g.players[detailIdx].bars[bi]
  M.changeBar(b, d)
  snd(d < 0 ? 'down' : 'up')
  if (M.checkState(g, detailIdx)) snd('death')
  commit()
  renderDetail()
}
function chgTok(bi: number, d: number): void {
  const g = G()
  const b = g.players[detailIdx].bars[bi]
  b.count = clamp((b.count || 0) + d, 0, 99)
  if (M.checkState(g, detailIdx)) snd('death')
  commit()
  renderDetail()
}
function chgCtr(bi: number, d: number): void {
  const g = G()
  const b = g.players[detailIdx].bars[bi]
  b.counters = (b.counters || 0) + d
  b.value += d
  b.max += d
  if (M.checkState(g, detailIdx)) snd('death')
  commit()
  renderDetail()
}
function delBar(bi: number): void {
  G().players[detailIdx].bars.splice(bi, 1)
  commit()
  renderDetail()
}

/* ───────── keypad ───────── */
function openKeypad(bi: number): void {
  kpCtx = { p: detailIdx, b: bi }
  kpSign = -1
  kpDigits = ''
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9]
  $('kp-keys')!.innerHTML =
    keys.map((k) => `<div class="key" onclick="HB.kpDigit(${k})">${k}</div>`).join('') +
    `<div class="key op" onclick="HB.kpToggle()">+/−</div><div class="key" onclick="HB.kpDigit(0)">0</div>
     <div class="key op" onclick="HB.kpBack()" aria-label="Backspace">${icon(ICON.backspace)}</div>`
  kpRender()
  openOvl('ovl-keypad')
}
function kpVal(): number {
  return kpSign * parseInt(kpDigits || '0')
}
function kpRender(): void {
  if (!kpCtx) return
  const p = G().players[kpCtx.p]
  const b = p.bars[kpCtx.b]
  const isLife = b.type === 'life' || b.type === 'extra'
  const v = kpVal()
  const nv = clamp(b.value + v, isLife ? -99 : 0, 999)
  $('kp-target')!.innerHTML = `<div class="gdot" style="width:24px;height:24px;${dotStyle(p.colors)}"></div>
    <b>${esc(p.name)} · ${esc(b.name)}</b> ${b.value} <span style="margin-left:auto"><b>→ ${nv}</b></span>`
  const amtEl = $('kp-amount')!
  amtEl.textContent = (v > 0 ? '+' : '−') + Math.abs(v)
  amtEl.style.color = v > 0 ? '#9ed3ae' : '#e8927c'
  const n = Math.abs(v)
  $('kp-apply')!.textContent =
    isLife || b.type === 'cmd' ? (v < 0 ? `DEAL ${n} DAMAGE` : v > 0 ? `GAIN ${n} LIFE` : 'APPLY') : `APPLY ${v > 0 ? '+' : v < 0 ? '−' : ''}${n}`
}
function kpDigit(d: number): void {
  if (kpDigits.length < 3) { kpDigits += '' + d; kpRender() }
}
function kpToggle(): void {
  kpSign *= -1
  kpRender()
}
function kpBack(): void {
  kpDigits = kpDigits.slice(0, -1)
  kpRender()
}
function kpApply(): void {
  if (!kpCtx) return
  const g = G()
  const b = g.players[kpCtx.p].bars[kpCtx.b]
  M.changeBar(b, kpVal())
  snd(kpVal() < 0 ? 'down' : 'up')
  if (M.checkState(g, kpCtx.p)) snd('death')
  commit()
  closeOvl()
  renderDetail()
}

/* ───────── static shell + wiring ───────── */
function buildShell(): void {
  const app = $('app')!
  app.innerHTML = `
  <div class="body">
    <div class="screen active" id="scr-setup"></div>
    <div class="screen" id="scr-edit"></div>
    <div class="screen" id="scr-game">
      <div class="game" id="grid"></div>
      <div class="hint" id="hint"></div>
      <div class="drawerscrim" id="drawerscrim"></div>
      <div class="sidedrawer" id="sidedrawer">
        <div class="iconbtn" onclick="HB.show('setup')" title="Setup" aria-label="Setup">${icon(ICON.gear)}</div>
        <div class="iconbtn" onclick="HB.rollDice()" title="Roll" aria-label="Roll for first">${icon(ICON.dice)}</div>
        <div class="iconbtn" id="btn-arr" onclick="HB.toggleRearrange()" title="Swap seats" aria-label="Swap seats">${icon(ICON.swap)}</div>
        <div class="iconbtn" onclick="HB.openOvl('ovl-reset')" title="Reset" aria-label="Reset">${icon(ICON.reset)}</div>
        <div class="iconbtn" onclick="HB.addPlayerLive()" title="Add player" aria-label="Add player">${icon(ICON.addPlayer)}</div>
        <div class="iconbtn" id="sndbtn" onclick="HB.toggleSound()" title="Sound" aria-label="Toggle sound">${icon(ICON.sound)}</div>
      </div>
      <div class="drawerhandle" id="drawerhandle" title="Tools" aria-label="Open tools"></div>
      <div class="edgezone" id="edgezone"></div>
    </div>
    <div class="screen" id="scr-detail"></div>

    <div class="ovl" id="ovl-keypad">
      <div class="sheet">
        <div class="target" id="kp-target"></div>
        <div class="amount" id="kp-amount">−0</div>
        <div class="keys" id="kp-keys"></div>
        <div class="applyrow">
          <div class="ghostbtn" onclick="HB.closeOvl()">CANCEL</div>
          <div class="cta" id="kp-apply" onclick="HB.kpApply()">APPLY</div>
        </div>
      </div>
    </div>

    <div class="ovl" id="ovl-addbar">
      <div class="sheet">
        <div class="sheettitle">SUMMON ANOTHER BAR</div>
        <div class="opt" onclick="HB.addBar('cmd')"><svg class="icon" style="color:var(--gold)" viewBox="0 0 24 24">${ICON.shield}</svg><div class="on">Commander Health</div><div class="os">21 / 21</div></div>
        <div class="opt" onclick="HB.addBar('poison')"><svg class="icon" style="color:var(--gold)" viewBox="0 0 24 24">${ICON.droplet}</svg><div class="on">Poison Counters</div><div class="os">0 / 10</div></div>
        <div class="opt" onclick="HB.addBar('energy')"><svg class="icon" style="color:var(--gold)" viewBox="0 0 24 24">${ICON.bolt}</svg><div class="on">Energy Counters</div><div class="os">0 / 20</div></div>
        <div class="opt" onclick="HB.addBar('token')"><svg class="icon" style="color:var(--gold)" viewBox="0 0 24 24">${ICON.token}</svg><div class="on">Tokens</div><div class="os">pick from all known tokens</div></div>
        <div class="opt" onclick="HB.addBar('extra')"><svg class="icon" style="color:var(--gold)" viewBox="0 0 24 24">${ICON.heart}</svg><div class="on">Extra Health Bar</div><div class="os">starts at game life</div></div>
        <div class="opt" onclick="HB.addBar('custom')"><svg class="icon" style="color:var(--gold)" viewBox="0 0 24 24">${ICON.diamond}</svg><div class="on">Custom Counter</div><div class="os">loyalty · experience · storm · anything</div></div>
        <div class="ghostbtn" onclick="HB.closeOvl()">CANCEL</div>
      </div>
    </div>

    <div class="ovl" id="ovl-tokenpick">
      <div class="sheet">
        <div class="sheettitle">SUMMON TOKENS</div>
        <input class="toksearch" id="toksearch" placeholder="Search tokens… (Food, Zombie, Treasure)" oninput="HB.renderTokenList(this.value)">
        <div class="toklist" id="toklist"></div>
        <div class="ghostbtn" onclick="HB.closeOvl()">CANCEL</div>
      </div>
    </div>

    <div class="ovl" id="ovl-dice">
      <div class="sheet">
        <div class="sheettitle">ROLL FOR FIRST</div>
        <div class="dicelist" id="dicelist"></div>
        <div class="applyrow">
          <div class="ghostbtn" onclick="HB.rollDice()">ROLL AGAIN</div>
          <div class="cta" style="flex:1" onclick="HB.closeOvl()">CLOSE</div>
        </div>
      </div>
    </div>

    <div class="ovl" id="ovl-reset">
      <div class="sheet">
        <div class="sheettitle">RESET</div>
        <div class="confirmtext"><b>Reset Duel</b> — same planeswalkers; every bar returns to its starting value.<br>
          <b>New Game</b> — back to setup: rename players, change colors, adjust everything, then begin anew.</div>
        <div class="applyrow">
          <div class="ghostbtn" onclick="HB.closeOvl()">CANCEL</div>
          <div class="cta" style="flex:1" onclick="HB.doReset()">RESET DUEL</div>
        </div>
        <div class="cta" onclick="HB.newGame()">NEW GAME</div>
      </div>
    </div>

    <div class="ovl" id="ovl-settings">
      <div class="sheet">
        <div class="sheettitle">SETTINGS</div>
        <div class="label">Turn Animation</div>
        <div class="animrow" id="animrow"></div>
        <div class="confirmtext" style="font-size:13px">Fires when the turn passes. Honors your device's “reduce motion” setting.</div>
        <div class="cta" onclick="HB.closeOvl()">DONE</div>
      </div>
    </div>
  </div>`
}

function wireGlobalGestures(): void {
  // drawer open from the bottom edge / handle; close on swipe-down or scrim tap
  let ey: number | null = null
  const dn = (e: PointerEvent) => { ey = e.clientY; e.stopPropagation() }
  const up = (e: PointerEvent) => {
    if (ey === null) return
    const dy = e.clientY - ey
    ey = null
    e.stopPropagation()
    if (dy < -24 || Math.abs(dy) < 8) setDrawer(true) // drag up from the edge, or tap the tab
  }
  ;[$('edgezone'), $('drawerhandle')].forEach((el) => {
    el?.addEventListener('pointerdown', dn)
    el?.addEventListener('pointerup', up)
  })
  $('drawerscrim')?.addEventListener('click', () => setDrawer(false))
  const dr = $('sidedrawer')!
  let dsy: number | null = null
  dr.addEventListener('pointerdown', (e) => { dsy = e.clientY })
  dr.addEventListener('pointerup', (e) => { if (dsy !== null && e.clientY - dsy > 32) setDrawer(false); dsy = null })
  // any tool except sound auto-closes the drawer
  dr.addEventListener('click', (e) => {
    const t = e.target as HTMLElement
    if (t.closest('.iconbtn') && !t.closest('#sndbtn')) setTimeout(() => setDrawer(false), 120)
  })
  window.addEventListener('resize', () => {
    updateDeviceClasses()
    if (curScreen === 'game') renderGame()
  })
  window.addEventListener('orientationchange', () => {
    updateDeviceClasses()
    if (curScreen === 'game') renderGame()
  })
}

/* ───────── the global controller ───────── */
const HB = {
  show,
  setMode,
  setLife,
  customLife,
  chgCount,
  movePlayer,
  openEdit,
  startGame,
  closeEdit,
  editName,
  toggleColor,
  openAddBar,
  addBar,
  renderTokenList,
  addToken,
  addCustomToken,
  renameBarE,
  delBarE,
  chipTap,
  openDetail,
  tapLife,
  tapStrip,
  openTokEdit,
  closeTokEdit,
  tokCtr,
  tokHp,
  tokCnt,
  tokDelete,
  tokRename,
  toggleRearrange,
  addPlayerLive,
  revive,
  toggleSound,
  rollDice,
  doReset,
  newGame: newGameAction,
  openSettings,
  setAnim,
  renameBar,
  delBar,
  chgBar,
  chgTok,
  chgCtr,
  openKeypad,
  kpDigit,
  kpToggle,
  kpBack,
  kpApply,
  openOvl,
  closeOvl,
}

declare global {
  interface Window {
    HB: typeof HB
  }
}

export function boot(): void {
  window.HB = HB
  injectManaDefs()
  buildShell()
  updateDeviceClasses()
  const resumed = hydrate() // a saved game means a game was in progress
  $('sndbtn')?.classList.toggle('off', !store.settings.soundOn)
  wireGlobalGestures()
  // resume the battlefield if we restored a save, otherwise open setup
  show(resumed ? 'game' : 'setup')
}
