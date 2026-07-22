/** per-bar-type icon + strip fill gradient (null grad = use the player's identity fill) */
import { ICON } from './icons'
import type { BarType } from '../state/types'

export interface StripMeta {
  icon: string
  grad: string | null
}

export const STRIPMETA: Partial<Record<BarType, StripMeta>> = {
  cmd: { icon: ICON.shield, grad: 'linear-gradient(90deg,#8a733f,#e8cf8a)' },
  poison: { icon: ICON.droplet, grad: 'linear-gradient(90deg,#4a7a2c,#8fbf5e)' },
  energy: { icon: ICON.bolt, grad: 'linear-gradient(90deg,#4a90c9,#c1d7e9)' },
  token: { icon: ICON.token, grad: 'linear-gradient(90deg,#1e5c3c,#5aae7c)' },
  extra: { icon: ICON.heart, grad: null },
  custom: { icon: ICON.diamond, grad: 'linear-gradient(90deg,#6b5527,#c9a64b)' },
}
