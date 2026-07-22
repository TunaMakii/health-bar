/**
 * Turn-transition animations. Three styles, selectable in the settings sheet:
 *  1 · Draw Slide   — board slides in from the side (320ms)
 *  2 · Planeswalk   — violet portal iris + depth arrival (550ms)
 *  3 · Combat Slash — a live snapshot of the OUTGOING panel is quartered by two
 *      blade streaks and flung off with a spark burst; the incoming board shakes
 *      on impact (~850ms).
 * All respect prefers-reduced-motion (the CSS disables [class*="anim-"] + .fx).
 */
import type { AnimKey } from '../state/types'

export const ANIMS: [AnimKey, string][] = [
  ['slide', 'Draw Slide'],
  ['walk', 'Planeswalk'],
  ['slash', 'Combat Slash'],
]

let prevHTML: string | null = null // snapshot of the outgoing panel, cut apart by the slash
let prevGrad: string | null = null // fallback frame gradient

/** snapshot the currently-rendered panel BEFORE the board re-renders */
export function captureSnapshot(fallbackGrad: string): void {
  const pe = document.querySelector('.mainwrap .panel')
  prevHTML = pe
    ? (pe as HTMLElement).outerHTML
        .replace(/\sid="[^"]*"/g, '') // no duplicate ids in the clones
        .replace(/anim-\w+/g, '') // don't replay the old entrance animation
    : null
  prevGrad = fallbackGrad
}

const FX: Record<string, () => string> = {
  walk: () => `<div class="iris"></div>`,
  slash: () => {
    const clone = prevHTML
    const piece = (cls: string): string =>
      clone
        ? `<div class="cpw ${cls}">${clone}</div>`
        : `<div class="cp ${cls}" style="${prevGrad ? `--pg:${prevGrad}` : ''}"></div>`
    const S = [
      [70, -42],
      [-62, -50],
      [52, 48],
      [-46, 42],
      [0, -70],
    ]
    return (
      piece('cpt') +
      piece('cpb') +
      piece('cpl') +
      piece('cpr') +
      `<div class="sl" style="--a:-24deg;animation-delay:.04s"></div>
       <div class="sl" style="--a:24deg;animation-delay:.32s"></div>` +
      S.map((s) => `<div class="spark" style="--dx:${s[0]}px;--dy:${s[1]}px"></div>`).join('')
    )
  },
}

/** play the given transition on the freshly-rendered panel */
export function playAnim(animKey: AnimKey, dir = 1): void {
  const wrap = document.querySelector('.mainwrap')
  const pe = wrap && (wrap.querySelector('.panel') as HTMLElement | null)
  if (!wrap || !pe) return
  wrap.querySelectorAll('.fx').forEach((e) => e.remove())
  ANIMS.forEach((a) => pe.classList.remove('anim-' + a[0]))
  pe.classList.remove('anim-slide-rev')
  void pe.offsetWidth // force reflow so the animation restarts
  pe.classList.add(animKey === 'slide' && dir < 0 ? 'anim-slide-rev' : 'anim-' + animKey)
  if (FX[animKey]) {
    const d = document.createElement('div')
    d.className = 'fx fx-' + animKey
    d.innerHTML = FX[animKey]()
    wrap.appendChild(d)
    setTimeout(() => d.remove(), 950)
  }
}
