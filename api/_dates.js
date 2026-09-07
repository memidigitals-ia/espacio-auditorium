/**
 * Helpers de fechas 'YYYY-MM-DD' sin dependencia de la zona horaria del runtime.
 * (Vercel corre en UTC; el negocio vive en America/Argentina/Buenos_Aires.)
 */
export const TZ = 'America/Argentina/Buenos_Aires'

/** Fecha de hoy en Buenos Aires. */
export function todayLocal(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function addDaysIso(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

export function addMonthsIso(iso, n) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + n, d)).toISOString().slice(0, 10)
}

/** Lista de fechas entre from y to (inclusive). Tope de 800 días por seguridad. */
export function eachDateIso(from, to) {
  const out = []
  let cur = from
  let guard = 0
  while (cur <= to && guard++ < 800) {
    out.push(cur)
    cur = addDaysIso(cur, 1)
  }
  return out
}

export function daysBetweenInclusive(from, to) {
  const [y1, m1, d1] = from.split('-').map(Number)
  const [y2, m2, d2] = to.split('-').map(Number)
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000) + 1
}
