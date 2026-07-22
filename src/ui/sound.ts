/**
 * sound & haptics — tiny WebAudio synth, no audio assets. Cues:
 *  down  — low down-tick on damage
 *  up    — brighter up-tick on gain
 *  turn  — rising swish on turn pass
 *  death — low sting on death
 * Vibration API fires alongside where supported. All gated by the mute toggle.
 */
import { store } from '../state/store'

export type SndKind = 'down' | 'up' | 'turn' | 'death'

let actx: AudioContext | null = null

export function snd(kind: SndKind): void {
  if (store.settings.soundOn) {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      actx = actx || new Ctx()
      const t = actx.currentTime
      const o = actx.createOscillator()
      const g = actx.createGain()
      o.connect(g)
      g.connect(actx.destination)
      if (kind === 'down') {
        o.type = 'triangle'
        o.frequency.setValueAtTime(220, t)
        o.frequency.exponentialRampToValueAtTime(110, t + 0.08)
        g.gain.setValueAtTime(0.11, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
        o.start(t)
        o.stop(t + 0.13)
      } else if (kind === 'up') {
        o.type = 'triangle'
        o.frequency.setValueAtTime(330, t)
        o.frequency.exponentialRampToValueAtTime(520, t + 0.07)
        g.gain.setValueAtTime(0.08, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
        o.start(t)
        o.stop(t + 0.11)
      } else if (kind === 'turn') {
        o.type = 'sine'
        o.frequency.setValueAtTime(392, t)
        o.frequency.exponentialRampToValueAtTime(587, t + 0.16)
        g.gain.setValueAtTime(0.06, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.22)
        o.start(t)
        o.stop(t + 0.23)
      } else if (kind === 'death') {
        o.type = 'sawtooth'
        o.frequency.setValueAtTime(196, t)
        o.frequency.exponentialRampToValueAtTime(65, t + 0.5)
        g.gain.setValueAtTime(0.15, t)
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.6)
        o.start(t)
        o.stop(t + 0.62)
      }
    } catch {
      /* no audio available */
    }
  }
  if (navigator.vibrate) navigator.vibrate(kind === 'death' ? [60, 40, 120] : kind === 'turn' ? 12 : 8)
}
