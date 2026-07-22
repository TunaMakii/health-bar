/**
 * manaSymbols.ts — the five MTG mana symbols (white sun, blue droplet, black
 * skull, red flame, green tree) plus colorless, as inline SVGs on their
 * mana-circle background colours.
 *
 * ⚠ IP NOTE: the mana symbols and their colours are property of Wizards of the
 * Coast. Everything WotC-derived lives in THIS one file so it is trivially
 * swappable before any public release — replace `MANA_SYMBOL_DEFS` and the
 * `circle` colours and the rest of the app keeps working.
 */

export type ManaKey = 'W' | 'U' | 'B' | 'R' | 'G' | 'C'

export interface ManaDef {
  /** mana-circle background colour */
  circle: string
  /** darker card-frame stop */
  frameD: string
  /** mid card-frame stop */
  frameM: string
  /** bar-fill accent */
  fill: string
  /** id of the <symbol> in the injected defs */
  sym: string
}

export const MANA: Record<ManaKey, ManaDef> = {
  W: { circle: '#f8f6d8', frameD: '#7a6b45', frameM: '#b9a06a', fill: '#e8e0c9', sym: 'sy-w' },
  U: { circle: '#c1d7e9', frameD: '#163a66', frameM: '#1b4e8c', fill: '#2c6fb5', sym: 'sy-u' },
  B: { circle: '#cac5c0', frameD: '#17141a', frameM: '#2e2a2b', fill: '#5c5470', sym: 'sy-b' },
  R: { circle: '#e49977', frameD: '#7d2822', frameM: '#a8352c', fill: '#c4462f', sym: 'sy-r' },
  G: { circle: '#a3c095', frameD: '#153f2a', frameM: '#1e5c3c', fill: '#5aae7c', sym: 'sy-g' },
  C: { circle: '#cbc9c8', frameD: '#3a3a3c', frameM: '#5a5a5e', fill: '#9fa4a8', sym: 'sy-c' },
}

/** canonical WUBRG order (C is standalone, listed last for the picker) */
export const COLOR_ORDER: ManaKey[] = ['W', 'U', 'B', 'R', 'G', 'C']

export const COLOR_NAMES: Record<ManaKey, string> = {
  W: 'White',
  U: 'Blue',
  B: 'Black',
  R: 'Red',
  G: 'Green',
  C: 'Colorless',
}

/** hidden <defs> of mana <symbol> shapes, referenced via <use href="#sy-x"> */
const MANA_SYMBOL_DEFS = `
<svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">
  <defs>
    <symbol id="sy-w" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.6"/><g stroke="#0d0f0f" stroke-width="2.2" stroke-linecap="round"><path d="M12 2.2v3.1M12 18.7v3.1M2.2 12h3.1M18.7 12h3.1M5.1 5.1l2.2 2.2M16.7 16.7l2.2 2.2M18.9 5.1l-2.2 2.2M7.3 16.7l-2.2 2.2"/></g></symbol>
    <symbol id="sy-u" viewBox="0 0 24 24"><path d="M12 2.4C9.2 7.2 5.8 10.4 5.8 14.4a6.2 6.2 0 0 0 12.4 0c0-4-3.4-7.2-6.2-12z"/></symbol>
    <symbol id="sy-b" viewBox="0 0 24 24"><path d="M12 3.2a6.6 6.6 0 0 0-6.6 6.6c0 2.6 1.5 4.3 3.1 5.5v3.4c0 .6.5 1.1 1.1 1.1h4.8c.6 0 1.1-.5 1.1-1.1v-3.4c1.6-1.2 3.1-2.9 3.1-5.5A6.6 6.6 0 0 0 12 3.2zm-2.6 8.2a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5.2 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM10.6 17v-1.6h.9V17h1v-1.6h.9V17z"/></symbol>
    <symbol id="sy-r" viewBox="0 0 24 24"><path d="M12 2.6c1.2 3.2-1.4 4.6-1.4 6.8 0 1.2 1 2.2 2.3 2.2 1.2 0 2.2-1 2.2-2.4 1.8 1.6 2.9 3.5 2.9 5.5A6 6 0 0 1 6 14.7c0-4.6 4.2-7.2 6-12.1z"/></symbol>
    <symbol id="sy-g" viewBox="0 0 24 24"><path d="M12 2.4 7.4 9h2.4l-4.2 6.4h5.2V21h2.4v-5.6h5.2L14.2 9h2.4z"/></symbol>
    <symbol id="sy-c" viewBox="0 0 24 24"><path d="M12 3l2.3 4.4L19 9l-3.3 3.6.7 5-4.4-2-4.4 2 .7-5L5 9l4.7-1.6z"/></symbol>
  </defs>
</svg>`

/** inject the mana <symbol> defs into the document once, on boot */
export function injectManaDefs(): void {
  if (document.getElementById('mana-defs')) return
  const holder = document.createElement('div')
  holder.id = 'mana-defs'
  holder.innerHTML = MANA_SYMBOL_DEFS
  document.body.appendChild(holder)
}

export type ManaSize = 'm-lg' | 'm-md' | 'm-sm'

/** a single mana circle with its symbol */
export function manaHTML(k: ManaKey, size: ManaSize = 'm-sm'): string {
  return `<div class="mana ${size}" style="background:${MANA[k].circle}"><svg><use href="#${MANA[k].sym}"/></svg></div>`
}
