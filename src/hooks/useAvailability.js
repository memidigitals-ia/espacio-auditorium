import { useState, useEffect, useCallback, useRef } from 'react'
import { format, isValid, addDays, differenceInCalendarDays } from 'date-fns'

// Disponibilidad pública: única fuente = GET /api/availability
// (reservas activas + holds + bloqueos manuales + Google Calendar, ya combinados en el server).
// Nunca se consulta Supabase desde el navegador.

const REFRESH_MS = 60 * 1000
const MIN_GAP_MS = 5 * 1000      // evita ráfagas al alternar pestañas
const FETCH_TIMEOUT_MS = 15 * 1000
const MAX_RANGE_DAYS = 60        // tope defensivo al evaluar rangos en el cliente

function toKey(date) {
  if (typeof date === 'string') return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null
  if (date instanceof Date && isValid(date)) return format(date, 'yyyy-MM-dd')
  return null
}

function buildMap(blocked) {
  const map = new Map()
  if (!Array.isArray(blocked)) return map
  for (const b of blocked) {
    if (!b || typeof b.date !== 'string') continue
    const prev = map.get(b.date) || { morning: false, afternoon: false }
    map.set(b.date, {
      morning: prev.morning || b.morning === true,
      afternoon: prev.afternoon || b.afternoon === true,
    })
  }
  return map
}

export function useAvailability() {
  const [blocked, setBlocked] = useState(() => new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [updatedAt, setUpdatedAt] = useState(null)
  const lastFetchRef = useRef(0)
  const inFlightRef = useRef(null)
  const mountedRef = useRef(true)

  const fetchAvailability = useCallback(async ({ force = false } = {}) => {
    const now = Date.now()
    if (!force && now - lastFetchRef.current < MIN_GAP_MS) return
    if (inFlightRef.current) return inFlightRef.current
    lastFetchRef.current = now

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const run = (async () => {
      try {
        const res = await fetch('/api/availability', {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
          cache: 'no-cache',
        })
        if (!res.ok) throw new Error(`availability ${res.status}`)
        const data = await res.json()
        if (!mountedRef.current) return
        setBlocked(buildMap(data?.blocked))
        setUpdatedAt(new Date())
        setError(false)
      } catch (err) {
        if (!mountedRef.current) return
        // Si falla, conservamos el último mapa conocido pero marcamos error:
        // BookingPage no deja continuar hasta que vuelva a responder.
        if (err?.name !== 'AbortError') console.error('[availability] no se pudo actualizar:', err?.message || err)
        setError(true)
      } finally {
        clearTimeout(timer)
        inFlightRef.current = null
        if (mountedRef.current) setLoading(false)
      }
    })()
    inFlightRef.current = run
    return run
  }, [])

  useEffect(() => {
    mountedRef.current = true
    fetchAvailability({ force: true })

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchAvailability()
    }, REFRESH_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchAvailability()
    }
    const onFocus = () => fetchAvailability()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onFocus)

    return () => {
      mountedRef.current = false
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onFocus)
    }
  }, [fetchAvailability])

  // Reglas de bloqueo (contrato §4):
  //   full_day           → bloqueado si mañana O tarde están ocupadas
  //   half_day_morning   → bloqueado si mañana ocupada
  //   half_day_afternoon → bloqueado si tarde ocupada
  const isDateBlocked = useCallback((date, slotType = 'full_day') => {
    const key = toKey(date)
    if (!key) return true
    const b = blocked.get(key)
    if (!b) return false
    if (slotType === 'half_day_morning') return b.morning
    if (slotType === 'half_day_afternoon') return b.afternoon
    return b.morning || b.afternoon
  }, [blocked])

  const isRangeAvailable = useCallback((from, to, slotType) => {
    if (!from) return true
    const start = from instanceof Date ? from : new Date(from)
    const endRaw = to ? (to instanceof Date ? to : new Date(to)) : start
    if (!isValid(start) || !isValid(endRaw)) return false
    const end = endRaw < start ? start : endRaw
    const span = differenceInCalendarDays(end, start)
    if (span > MAX_RANGE_DAYS) return false
    for (let i = 0; i <= span; i++) {
      if (isDateBlocked(addDays(start, i), slotType)) return false
    }
    return true
  }, [isDateBlocked])

  const refresh = useCallback(() => fetchAvailability({ force: true }), [fetchAvailability])

  return { blocked, loading, error, updatedAt, isDateBlocked, isRangeAvailable, refresh }
}
