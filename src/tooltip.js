/**
 * JS-positioned tooltip system.
 *
 * Appends a single tooltip element to <body> so it's never clipped
 * by overflow:hidden on parent cards. Reads from data-tip attributes.
 */

let el = null
let hideTimer = null

function ensureEl() {
  if (el) return
  el = document.createElement('div')
  el.className = 'tip'
  el.setAttribute('role', 'tooltip')
  document.body.appendChild(el)
}

function show(e) {
  const target = e.target.closest('[data-tip]')
  if (!target) return
  clearTimeout(hideTimer)
  ensureEl()

  el.textContent = target.dataset.tip
  el.style.opacity = '0'
  el.style.display = 'block'

  // Measure and position
  const rect = target.getBoundingClientRect()
  const tipRect = el.getBoundingClientRect()
  const pad = 10

  // Default: above the element, centered
  let top = rect.top - tipRect.height - pad + window.scrollY
  let left = rect.left + rect.width / 2 - tipRect.width / 2 + window.scrollX

  // Flip below if it would go off-screen top
  if (top - window.scrollY < pad) {
    top = rect.bottom + pad + window.scrollY
  }

  // Clamp horizontal
  const maxLeft = window.scrollX + window.innerWidth - tipRect.width - pad
  left = Math.max(window.scrollX + pad, Math.min(left, maxLeft))

  el.style.top = top + 'px'
  el.style.left = left + 'px'
  el.style.opacity = '1'
}

function hide() {
  hideTimer = setTimeout(() => {
    if (el) {
      el.style.opacity = '0'
      el.style.display = 'none'
    }
  }, 80)
}

export function initTooltips() {
  document.addEventListener('pointerenter', show, true)
  document.addEventListener('pointerleave', hide, true)
  // Hide on scroll to avoid stale positions
  document.addEventListener('scroll', () => {
    if (el) { el.style.opacity = '0'; el.style.display = 'none' }
  }, { passive: true })
}
