/**
 * colors.ts — colour-identity derivations. A colour identity is a free
 * combination of W/U/B/R/G (stored in canonical WUBRG order) or colorless
 * (['C'], standalone). From the combination we derive the card frame gradient,
 * the bar-fill gradient and the identity swatch. All five colours = "Rainbow".
 *
 * These are pure string helpers with no WotC IP of their own — they only read
 * the palette exposed by manaSymbols.ts.
 */
import { MANA, COLOR_ORDER, COLOR_NAMES, manaHTML, type ManaKey } from './manaSymbols'

export type { ManaKey }

/** human-readable name for a colour identity */
export function colorsName(cs: ManaKey[]): string {
  if (cs.length === 1) return COLOR_NAMES[cs[0]]
  if (cs.length === 5) return 'Rainbow'
  return cs.join('')
}

/** sort an arbitrary colour set into canonical WUBRG order (C stands alone) */
export function canonicalColors(cs: ManaKey[]): ManaKey[] {
  if (cs.includes('C')) return ['C']
  const ordered = COLOR_ORDER.filter((x) => x !== 'C').filter((x) => cs.includes(x))
  return ordered.length ? ordered : ['W']
}

/** swatch background for a colour dot: single, 2-colour split, or 3+ conic */
export function dotStyle(colors: ManaKey[]): string {
  if (colors.length === 1) return `background:${MANA[colors[0]].circle}`
  if (colors.length === 2)
    return `background:linear-gradient(135deg,${MANA[colors[0]].circle} 50%,${MANA[colors[1]].circle} 50%)`
  const seg = 360 / colors.length
  return `background:conic-gradient(${colors
    .map((c, i) => `${MANA[c].circle} ${i * seg}deg ${(i + 1) * seg}deg`)
    .join(',')})`
}

/** card-frame background gradient */
export function frameGrad(colors: ManaKey[]): string {
  if (colors.length === 1) {
    const c = MANA[colors[0]]
    return `linear-gradient(160deg,${c.frameD},${c.frameM} 55%,${c.frameD})`
  }
  if (colors.length === 2) {
    const a = MANA[colors[0]]
    const b = MANA[colors[1]]
    return `linear-gradient(150deg,${a.frameD} 0%,${a.frameM} 45%,${b.frameM} 60%,${b.frameD} 100%)`
  }
  const stops = colors
    .map((c, i) => `${MANA[c].frameM} ${Math.round((i / (colors.length - 1)) * 100)}%`)
    .join(',')
  return `linear-gradient(150deg,${stops})`
}

/** bar-fill gradient for a colour identity */
export function fillGrad(colors: ManaKey[]): string {
  if (colors.length === 1) {
    const c = MANA[colors[0]]
    return `linear-gradient(90deg,${c.frameM},${c.fill})`
  }
  const stops = colors
    .map((c, i) => `${MANA[c].fill} ${Math.round((i / (colors.length - 1)) * 100)}%`)
    .join(',')
  return `linear-gradient(90deg,${stops})`
}

/** mana circles for 1-2 colours, conic swatch dot for 3+ */
export function idBadgeHTML(colors: ManaKey[], px = 20): string {
  if (colors.length <= 2) return colors.map((k) => manaHTML(k, 'm-sm')).join('')
  return `<div class="gdot" style="width:${px}px;height:${px}px;${dotStyle(colors)}"></div>`
}
