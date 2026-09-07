/**
 * GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Única fuente de disponibilidad para el calendario del sitio. No expone
 * datos personales ni títulos del calendario: sólo fecha + franjas ocupadas.
 * Se cachea en el edge de Vercel 60 s (stale-while-revalidate 5 min).
 *
 * Respuesta 200: { from, to, holdMinutes, generatedAt, blocked: [{date, morning, afternoon}] }
 * Respuesta 503: { error: 'calendar_unavailable' } → el frontend NO deja continuar.
 */
import { handleOptions, error, safeError, cors } from './_utils.js'
import { getBlockedMap, serializeBlocked, todayLocal, HOLD_MINUTES, addDaysIso } from './_availability.js'
import { isIsoDate } from './_validate.js'

const MAX_RANGE_DAYS = 730

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'GET') return error(res, 'Method not allowed', 405)

  const today = todayLocal()
  let from = typeof req.query.from === 'string' && isIsoDate(req.query.from) ? req.query.from : today
  let to = typeof req.query.to === 'string' && isIsoDate(req.query.to) ? req.query.to : addDaysIso(today, 548)
  if (from < today) from = today
  if (to < from) to = from
  if (to > addDaysIso(from, MAX_RANGE_DAYS)) to = addDaysIso(from, MAX_RANGE_DAYS)

  try {
    const { map, calendarOk, calendarError } = await getBlockedMap({ from, to })
    if (!calendarOk) {
      console.error('[availability] Google Calendar no disponible:', calendarError)
      cors(res)
      res.setHeader('Cache-Control', 'no-store')
      return res.status(503).json({ error: 'calendar_unavailable' })
    }
    cors(res)
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
    return res.status(200).json({
      from, to,
      holdMinutes: HOLD_MINUTES,
      generatedAt: new Date().toISOString(),
      blocked: serializeBlocked(map),
    })
  } catch (err) {
    return safeError(res, 'availability', err, 'No pudimos verificar la disponibilidad', 503)
  }
}
