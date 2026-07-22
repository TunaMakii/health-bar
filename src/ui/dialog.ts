/** themed input dialog — a promise-based replacement for window.prompt() */
import { esc } from './dom'

export interface Field {
  label: string
  value?: string
  type?: 'text' | 'number'
  maxlength?: number
  placeholder?: string
  min?: number
}

/** ask one or more fields; resolves with trimmed values, or null if cancelled */
export function askFields(title: string, fields: Field[], okLabel = 'CONFIRM'): Promise<string[] | null> {
  return new Promise((resolve) => {
    const host = document.querySelector('.body') || document.getElementById('app') || document.body
    const ovl = document.createElement('div')
    ovl.className = 'ovl open'
    ovl.style.zIndex = '60'
    ovl.innerHTML = `
      <div class="sheet">
        <div class="sheettitle">${esc(title)}</div>
        ${fields
          .map(
            (f, i) => `
          <div>
            <div class="label">${esc(f.label)}</div>
            <input class="nameinput" data-i="${i}" type="${f.type || 'text'}"
              ${f.maxlength ? `maxlength="${f.maxlength}"` : ''}
              ${f.type === 'number' ? `inputmode="numeric"` : ''}
              ${f.min != null ? `min="${f.min}"` : ''}
              placeholder="${esc(f.placeholder || '')}" value="${esc(f.value || '')}">
          </div>`,
          )
          .join('')}
        <div class="applyrow">
          <div class="ghostbtn" data-act="cancel">CANCEL</div>
          <div class="cta" style="flex:1.4" data-act="ok">${esc(okLabel)}</div>
        </div>
      </div>`
    host.appendChild(ovl)

    const inputs = Array.from(ovl.querySelectorAll<HTMLInputElement>('input'))
    const done = (result: string[] | null) => {
      ovl.remove()
      resolve(result)
    }
    const submit = () => done(inputs.map((el) => el.value.trim()))

    ovl.querySelector('[data-act="ok"]')!.addEventListener('click', submit)
    ovl.querySelector('[data-act="cancel"]')!.addEventListener('click', () => done(null))
    ovl.addEventListener('pointerdown', (e) => {
      if (e.target === ovl) done(null) // scrim tap
    })
    inputs.forEach((el) =>
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit()
        if (e.key === 'Escape') done(null)
      }),
    )
    setTimeout(() => {
      inputs[0]?.focus()
      inputs[0]?.select()
    }, 40)
  })
}
