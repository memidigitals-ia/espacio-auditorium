/**
 * POST /api/admin-blocked-dates  (Authorization: Bearer <token de sesión>)
 *
 * Bloqueos manuales de fechas (tabla blocked_dates). Los consume el módulo
 * compartido de disponibilidad, así que un bloqueo acá saca la fecha de la
 * venta online y de la respuesta del bot.
 *
 *  { action:'list' }                                   → { blocked:[{id,date,slot_type,reason,created_at}] }
 *  { action:'add', date, endDate?, slot_type, reason? } → { ok:true, added:n, skipped:n }
 *      rango inclusive de hasta MAX_RANGE_DAYS días; si ya existe el mismo
 *      día+franja se saltea (no duplica)
 *  { action:'delete', id }                             → { ok:true }
 */
import { handleOptions, json, error, safeError, parseBody, requireAdmin, supabaseAdmin } from './_utils.js'
import { isIsoDate, isUuid, cleanText, SLOT_TYPES } from './_validate.js'
import { todayLocal, addMonthsIso, eachDateIso, daysBetweenInclusive } from './_dates.js'

const MAX_RANGE_DAYS = 60
const MAX_REASON_LENGTH = 200
const MAX_MONTHS_AHEAD = 24
const LIST_LIMIT = 1000
const LIST_COLUMNS = 'id, date, slot_type, reason, created_at'

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

  const action = typeof body.action === 'string' ? body.action.trim() : ''

  try {
    const db = supabaseAdmin()
    if (action === 'list') return await listBlocked(db, res)
    if (action === 'add') return await addBlocked(db, body, res)
    if (action === 'delete') return await deleteBlocked(db, body, res)
    return error(res, 'Acción inválida (list | add | delete)', 400)
  } catch (err) {
    return safeError(res, `admin-blocked-dates:${action || 'unknown'}`, err, 'No pudimos procesar los bloqueos. Intentá de nuevo.')
  }
}

async function listBlocked(db, res) {
  const { data, error: dbErr } = await db
    .from('blocked_dates')
    .select(LIST_COLUMNS)
    .order('date', { ascending: true })
    .order('slot_type', { ascending: true })
    .limit(LIST_LIMIT)
  if (dbErr) throw dbErr
  return json(res, { blocked: data || [] })
}

async function addBlocked(db, body, res) {
  const date = typeof body.date === 'string' ? body.date.trim() : ''
  const endDateRaw = typeof body.endDate === 'string' ? body.endDate.trim() : ''
  const endDate = endDateRaw || date
  const slotType = typeof body.slot_type === 'string' ? body.slot_type.trim() : ''
  const reason = cleanText(body.reason, MAX_REASON_LENGTH)

  if (!isIsoDate(date)) return error(res, 'Fecha inválida (formato YYYY-MM-DD)', 400)
  if (!isIsoDate(endDate)) return error(res, 'Fecha de fin inválida (formato YYYY-MM-DD)', 400)
  if (endDate < date) return error(res, 'La fecha de fin no puede ser anterior a la de inicio', 400)
  if (!SLOT_TYPES.includes(slotType)) return error(res, 'Franja inválida', 400)

  const today = todayLocal()
  if (date < today) return error(res, 'No se pueden bloquear fechas pasadas', 400)
  if (endDate > addMonthsIso(today, MAX_MONTHS_AHEAD)) return error(res, `Sólo se pueden bloquear fechas hasta ${MAX_MONTHS_AHEAD} meses adelante`, 400)

  const span = daysBetweenInclusive(date, endDate)
  if (span > MAX_RANGE_DAYS) return error(res, `El rango máximo es de ${MAX_RANGE_DAYS} días`, 400)

  // Bloqueos ya existentes para esa franja en el rango: no se duplican
  const { data: existing, error: selErr } = await db
    .from('blocked_dates')
    .select('date')
    .eq('slot_type', slotType)
    .gte('date', date)
    .lte('date', endDate)
  if (selErr) throw selErr
  const taken = new Set((existing || []).map(r => r.date))

  const rows = eachDateIso(date, endDate)
    .filter(d => !taken.has(d))
    .map(d => ({ date: d, slot_type: slotType, reason, created_by: 'admin' }))

  if (rows.length === 0) return json(res, { ok: true, added: 0, skipped: span })

  const { error: insErr } = await db.from('blocked_dates').insert(rows)
  if (insErr) throw insErr

  console.log(`[admin-blocked-dates] ${rows.length} bloqueo(s) ${slotType} ${date}..${endDate}`)
  return json(res, { ok: true, added: rows.length, skipped: span - rows.length })
}

async function deleteBlocked(db, body, res) {
  const id = typeof body.id === 'string' ? body.id.trim() : ''
  if (!isUuid(id)) return error(res, 'id inválido', 400)

  const { data, error: delErr } = await db
    .from('blocked_dates')
    .delete()
    .eq('id', id)
    .select('id')
  if (delErr) throw delErr
  if (!data || data.length === 0) return error(res, 'Bloqueo no encontrado', 404)

  console.log(`[admin-blocked-dates] bloqueo eliminado ${id}`)
  return json(res, { ok: true })
}
