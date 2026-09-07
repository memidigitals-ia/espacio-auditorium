/**
 * POST /api/admin-cancel  (Authorization: Bearer <token de sesión>)
 * body: { id, reason? }
 *
 * Cancela una reserva desde el panel: marca status='cancelled' (cancel_reason
 * 'admin') y libera el evento de Google Calendar si existía.
 *
 * Orden: primero la base (fuente de verdad) y después el calendario. Si el
 * calendario falla, la reserva queda cancelada igual y el resultado lo dice
 * (`calendar:'failed'`) para que el admin borre el evento a mano.
 *
 * Respuesta: { ok:true, calendar:'deleted'|'already_gone'|'failed'|'none', skipped?:true }
 *   skipped:true → ya estaba cancelada/devuelta, no se tocó nada.
 */
import { handleOptions, json, error, safeError, parseBody, requireAdmin, supabaseAdmin, logError } from './_utils.js'
import { deleteCalendarEvent } from './_calendar.js'
import { isUuid, cleanText } from './_validate.js'

/** Estados finales: cancelar de nuevo no hace nada. */
const ALREADY_CLOSED = ['cancelled', 'refunded']
/** Columnas de la migración de fase B: si todavía no existen (42703) se reintenta sin ellas. */
const PHASE_B_COLUMNS = ['cancel_reason', 'calendar_sync_error']
const UNDEFINED_COLUMN = '42703'

/**
 * update() tolerante a columnas de fase B faltantes.
 * @returns {Promise<{data:Array, error:object|null}>}
 */
async function updateTolerant(db, id, patch, matchStatus) {
  const run = p => db.from('reservations').update(p).eq('id', id).eq('status', matchStatus).select('id')
  let result = await run(patch)
  if (result.error && result.error.code === UNDEFINED_COLUMN) {
    const stripped = Object.fromEntries(Object.entries(patch).filter(([k]) => !PHASE_B_COLUMNS.includes(k)))
    if (Object.keys(stripped).length === Object.keys(patch).length) return result // no era una columna de fase B
    console.warn('[admin-cancel] columnas de fase B ausentes; reintentando sin', PHASE_B_COLUMNS.join(', '))
    // Si sólo había columnas de fase B no queda nada que actualizar
    if (Object.keys(stripped).length === 0) return { data: [{ id }], error: null }
    result = await run(stripped)
  }
  return result
}

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

  const id = typeof body.id === 'string' ? body.id.trim() : ''
  if (!isUuid(id)) return error(res, 'id inválido', 400)
  const note = cleanText(body.reason, 200)

  try {
    const db = supabaseAdmin()

    const { data: reservation, error: fetchErr } = await db
      .from('reservations')
      .select('id, status, calendar_event_id')
      .eq('id', id)
      .maybeSingle()
    if (fetchErr) throw fetchErr
    if (!reservation) return error(res, 'Reserva no encontrada', 404)
    if (ALREADY_CLOSED.includes(reservation.status)) return json(res, { ok: true, skipped: true, calendar: 'none' })

    // 1) Base de datos: sólo si el estado no cambió entre la lectura y el update
    const { data: updated, error: updateErr } = await updateTolerant(
      db, id, { status: 'cancelled', cancel_reason: 'admin' }, reservation.status,
    )
    if (updateErr) throw updateErr
    if (!updated || updated.length === 0) {
      // Otro proceso la modificó en el medio (p. ej. webhook o auto-cancel)
      console.warn(`[admin-cancel] reserva ${id} cambió de estado durante la cancelación; no se tocó`)
      return json(res, { ok: true, skipped: true, calendar: 'none' })
    }

    // 2) Google Calendar
    let calendar = 'none'
    if (reservation.calendar_event_id) {
      const del = await deleteCalendarEvent(reservation.calendar_event_id)
      if (del.ok) {
        calendar = del.alreadyGone ? 'already_gone' : 'deleted'
      } else {
        calendar = 'failed'
        const { error: syncErr } = await updateTolerant(
          db, id, { calendar_sync_error: `delete: ${String(del.error || 'error').slice(0, 300)}` }, 'cancelled',
        )
        if (syncErr) logError('admin-cancel:sync-error', syncErr, { id })
      }
    }

    console.log(`[admin-cancel] reserva ${id} cancelada (antes: ${reservation.status}, calendario: ${calendar})${note ? ` motivo: ${note}` : ''}`)
    return json(res, { ok: true, calendar })
  } catch (err) {
    return safeError(res, 'admin-cancel', err, 'No pudimos cancelar la reserva. Intentá de nuevo.')
  }
}
