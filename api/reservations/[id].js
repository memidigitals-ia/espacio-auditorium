/**
 * GET /api/reservations/:id?t=<public_token>
 *
 * Consulta pública del estado de una reserva (la usa /pago al volver de
 * Mercado Pago). Sólo responde si `t` coincide con el `public_token` de la
 * fila; en cualquier otro caso devuelve 404 sin distinguir "no existe" de
 * "token incorrecto". Devuelve una proyección sin datos de contacto.
 *
 * 200 { id, status, start_date, end_date, slot_type, event_type, deposit_amount,
 *       balance_amount, total_price, first_name, coupon_discount_pct }
 * 400 id inválido · 404 no encontrada / token inválido / cancelada hace +30 días
 * 429 demasiadas consultas desde la misma IP
 *
 * Si la columna public_token todavía no existe (base en fase A) responde 404
 * y loguea: preferimos no mostrar nada antes que mostrar sin token.
 */
import { handleOptions, json, error, safeError, cors, getClientIp, constantTimeEqual, checkRateLimit, supabaseAdmin } from '../_utils.js'
import { isUuid } from '../_validate.js'

const UNDEFINED_COLUMN = '42703'
const TOKEN_RE = /^[A-Za-z0-9_-]{16,128}$/
/** Días durante los que una reserva cerrada sigue consultable (para que /pago no rompa justo después). */
const CLOSED_VISIBLE_DAYS = 30
const CLOSED_STATUSES = ['cancelled', 'refunded', 'expired']
/** /pago consulta cada 3 s hasta 90 s (~30 llamadas): 120 cada 10 min por IP alcanza de sobra. */
const RATE_LIMIT = { bucket: 'reservation-lookup:ip', max: 120, windowSeconds: 600 }

const BASE_COLUMNS = [
  'id', 'status', 'start_date', 'end_date', 'slot_type', 'event_type',
  'deposit_amount', 'balance_amount', 'total_price', 'first_name', 'updated_at',
]
const PHASE_B_COLUMNS = ['public_token', 'coupon_discount_pct']

function setPrivateHeaders(res) {
  cors(res)
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Robots-Tag', 'noindex, nofollow')
}

/**
 * Lee la fila con las columnas de fase B; si coupon_discount_pct falta
 * reintenta sólo con public_token. Si public_token falta → { missingToken:true }.
 */
async function loadReservation(db, id) {
  const attempts = [
    [...BASE_COLUMNS, ...PHASE_B_COLUMNS],
    [...BASE_COLUMNS, 'public_token'],
  ]
  for (const cols of attempts) {
    const { data, error: dbErr } = await db.from('reservations').select(cols.join(', ')).eq('id', id).maybeSingle()
    if (!dbErr) return { data }
    if (dbErr.code !== UNDEFINED_COLUMN) throw dbErr
  }
  return { missingToken: true }
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  setPrivateHeaders(res)
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS')
    return error(res, 'Method not allowed', 405)
  }

  const id = typeof req.query.id === 'string' ? req.query.id.trim() : ''
  if (!isUuid(id)) return error(res, 'Reserva inválida', 400)

  const token = typeof req.query.t === 'string' ? req.query.t.trim() : ''
  if (!TOKEN_RE.test(token)) return error(res, 'Reserva no encontrada', 404)

  try {
    const rl = await checkRateLimit({ ...RATE_LIMIT, key: getClientIp(req) })
    if (!rl.allowed) {
      res.setHeader('Retry-After', String(rl.retryAfterSeconds))
      return error(res, 'Demasiadas consultas. Esperá unos minutos e intentá de nuevo.', 429)
    }

    const db = supabaseAdmin()
    const { data, missingToken } = await loadReservation(db, id)

    if (missingToken) {
      console.error('[reservations] la columna public_token no existe (falta la migración de fase B): se responde 404')
      return error(res, 'Reserva no encontrada', 404)
    }
    if (!data || !data.public_token || !constantTimeEqual(token, data.public_token)) {
      return error(res, 'Reserva no encontrada', 404)
    }

    if (CLOSED_STATUSES.includes(data.status)) {
      const closedAt = Date.parse(data.updated_at || '')
      if (Number.isFinite(closedAt) && Date.now() - closedAt > CLOSED_VISIBLE_DAYS * 86400 * 1000) {
        return error(res, 'Reserva no encontrada', 404)
      }
    }

    return json(res, {
      id: data.id,
      status: data.status,
      start_date: data.start_date,
      end_date: data.end_date,
      slot_type: data.slot_type,
      event_type: data.event_type,
      deposit_amount: data.deposit_amount,
      balance_amount: data.balance_amount,
      total_price: data.total_price,
      first_name: data.first_name,
      coupon_discount_pct: Number(data.coupon_discount_pct ?? 0) || 0,
    })
  } catch (err) {
    return safeError(res, 'reservations:get', err, 'No pudimos consultar la reserva. Intentá de nuevo en unos minutos.')
  }
}
