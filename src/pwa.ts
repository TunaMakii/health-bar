/** service-worker registration + a subtle "new version" toast */
import { registerSW } from 'virtual:pwa-register'

function showToast(message: string, action: string, onAction: () => void): void {
  const host = document.querySelector('.body') || document.getElementById('app') || document.body
  const el = document.createElement('div')
  el.className = 'toast'
  el.innerHTML = `<span class="tmsg"></span><span class="tbtn"></span>`
  el.querySelector('.tmsg')!.textContent = message
  const btn = el.querySelector('.tbtn') as HTMLElement
  btn.textContent = action
  btn.addEventListener('click', () => {
    el.remove()
    onAction()
  })
  host.appendChild(el)
}

export function initPWA(): void {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      showToast('A new version is ready.', 'REFRESH', () => updateSW(true))
    },
  })
}
