import { useEffect, useRef } from 'react'

// Cloudflare Turnstile (anti-bot) opcional: sólo se monta si VITE_TURNSTILE_SITE_KEY existe.
// El script se carga on demand (nunca en el <head>), una sola vez por sesión.

export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY || '').trim()
export const hasTurnstile = () => TURNSTILE_SITE_KEY.length > 0

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let scriptPromise = null

function loadScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile no disponible')))
    s.onerror = () => { scriptPromise = null; reject(new Error('no se pudo cargar turnstile')) }
    document.head.appendChild(s)
  })
  return scriptPromise
}

/**
 * @param {{ onToken: (token: string) => void, resetKey?: number }} props
 * `onToken('')` se llama cuando el token expira o falla; `resetKey` fuerza un nuevo desafío.
 */
export default function Turnstile({ onToken, resetKey = 0 }) {
  const containerRef = useRef(null)
  const widgetIdRef = useRef(null)
  const onTokenRef = useRef(onToken)
  onTokenRef.current = onToken

  useEffect(() => {
    if (!hasTurnstile()) return undefined
    let cancelled = false

    loadScript()
      .then(ts => {
        if (cancelled || !containerRef.current) return
        widgetIdRef.current = ts.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: 'dark',
          language: 'es',
          appearance: 'always',
          callback: (token) => onTokenRef.current(token || ''),
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => onTokenRef.current(''),
          'timeout-callback': () => onTokenRef.current(''),
        })
      })
      .catch(err => {
        console.error('[turnstile]', err?.message || err)
        onTokenRef.current('')
      })

    return () => {
      cancelled = true
      const id = widgetIdRef.current
      if (id !== null && window.turnstile) {
        try { window.turnstile.remove(id) } catch { /* ya desmontado */ }
      }
      widgetIdRef.current = null
    }
  }, [])

  useEffect(() => {
    if (resetKey === 0) return
    const id = widgetIdRef.current
    if (id !== null && window.turnstile) {
      try { window.turnstile.reset(id) } catch { /* widget no listo */ }
    }
    onTokenRef.current('')
  }, [resetKey])

  if (!hasTurnstile()) return null
  return <div ref={containerRef} className="turnstile-box" aria-label="Verificación de seguridad" />
}
