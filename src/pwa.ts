/** service-worker registration — auto-updates so new deploys apply without a manual refresh */
import { registerSW } from 'virtual:pwa-register'

export function initPWA(): void {
  registerSW({ immediate: true })
}
