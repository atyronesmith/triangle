/**
 * Shareable URL state — encodes slider configuration in the URL hash.
 * Only encodes values that differ from defaults for shorter URLs.
 * Does NOT encode accumulated state (debt, morale, jevons, simWeek).
 */

const DEFAULTS = {
  aiGen: 0, aiReview: 0, aiMgmt: 0,
  scope: 0, review: 10, time: 0,
  paradigm: 15, elasticity: 30, amdahl: 50, seniority: 50,
}

const KEYS = Object.keys(DEFAULTS)

let debounceTimer = null

export function encodeToHash(sliderValues) {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const params = new URLSearchParams()
    KEYS.forEach(k => {
      const v = sliderValues[k]
      if (v !== undefined && v !== DEFAULTS[k]) {
        params.set(k, v)
      }
    })
    const hash = params.toString()
    history.replaceState(null, '', hash ? '#' + hash : window.location.pathname)
  }, 150)
}

export function decodeFromHash() {
  const hash = window.location.hash.slice(1)
  if (!hash) return null

  const params = new URLSearchParams(hash)
  const values = { ...DEFAULTS }
  let hasValues = false

  KEYS.forEach(k => {
    if (params.has(k)) {
      values[k] = Number(params.get(k))
      hasValues = true
    }
  })

  return hasValues ? values : null
}

export function initCopyLink(buttonEl) {
  if (!buttonEl) return
  buttonEl.addEventListener('click', () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      buttonEl.classList.add('copied')
      buttonEl.textContent = 'Copied!'
      setTimeout(() => {
        buttonEl.classList.remove('copied')
        buttonEl.textContent = 'Copy link'
      }, 2000)
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      buttonEl.textContent = 'Copied!'
      setTimeout(() => { buttonEl.textContent = 'Copy link' }, 2000)
    })
  })
}
