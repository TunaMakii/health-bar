/** tiny DOM helpers */
export const $ = (id: string): HTMLElement | null => document.getElementById(id)

/** escape a user string for safe insertion into HTML text or attributes */
export function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
