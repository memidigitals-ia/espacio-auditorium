/**
 * POST /api/admin-reservations  (Authorization: Bearer <token de sesión>)
 * body: { status?: 'all'|'pending_payment'|'deposit_paid'|'confirmed'|'cancelled'|'refunded'|'payment_conflict'|'expired', limit?: n≤500 }
 *
 * Listado completo de reservas para el panel de administración. Lee con el
 * service role (el rol anon ya no tiene acceso a datos personales).
 *
 * Respuesta: 200 {reservations:[fila completa...]} ordenadas por created_at desc
 *            401 sesión inválida → el frontend vuelve al login
 */
import { handleOptions, json, error, safeError, parseBody, requireAdmin, supabaseAdmin } from './_utils.js'

export const RESERVATION_STATUSES = [
  'pending_payment', 'deposit_paid', 'confirmed', 'cancelled', 'refunded', 'payment_conflict', 'expired',
]
const MAX_LIMIT = 500
const DEFAULT_LIMIT = 500

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return error(res, 'Method not allowed', 405)
  }

  const auth = await requireAdmin(req)
  if (!auth.ok) return error(res, auth.message, auth.status)

  const body = parseBody(req)
  // La contraseña sólo se acepta en /api/admin-auth; acá va el token de sesión.
  if (Object.hasOwn(body, 'password')) return error(res, 'Usá el token de sesión (Authorization: Bearer), no la contraseña', 400)

  const status = typeof body.status === 'string' && body.status.trim() ? body.status.trim() : 'all'
  if (status !== 'all' && !RESERVATION_STATUSES.includes(status)) return error(res, 'Filtro de estado inválido', 400)

  let limit = DEFAULT_LIMIT
  if (body.limit !== undefined && body.limit !== null && body.limit !== '') {
    const n = Number(body.limit)
    if (!Number.isInteger(n) || n < 1) return error(res, 'limit inválido', 400)
    limit = Math.min(n, MAX_LIMIT)
  }

  try {
    let query = supabaseAdmin()
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (status !== 'all') query = query.eq('status', status)

    const { data, error: dbErr } = await query
    if (dbErr) throw dbErr

    return json(res, { reservations: data || [] })
  } catch (err) {
    return safeError(res, 'admin-reservations', err, 'No pudimos cargar las reservas. Intentá de nuevo.')
  }
}
