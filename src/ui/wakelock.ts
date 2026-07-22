/**
 * Screen Wake Lock — keep the display awake while a game is active, and
 * re-acquire it when the tab becomes visible again (locks are dropped on hide).
 * No-op where the API is unsupported.
 */
interface WakeSentinel {
  release: () => Promise<void>
  addEventListener: (t: string, cb: () => void) => void
}
interface WakeNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<WakeSentinel> }
}

let sentinel: WakeSentinel | null = null
let want = false

async function acquire(): Promise<void> {
  const nav = navigator as unknown as WakeNavigator
  try {
    if (want && document.visibilityState === 'visible' && nav.wakeLock && !sentinel) {
      sentinel = await nav.wakeLock.request('screen')
      sentinel.addEventListener('release', () => {
        sentinel = null
      })
    }
  } catch {
    /* denied / unsupported */
  }
}
function release(): void {
  try {
    sentinel?.release()
  } catch {
    /* ignore */
  }
  sentinel = null
}

/** turn the wake lock on/off (call with true while a game is on screen) */
export function setWake(on: boolean): void {
  want = on
  if (on) void acquire()
  else release()
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') void acquire()
})
