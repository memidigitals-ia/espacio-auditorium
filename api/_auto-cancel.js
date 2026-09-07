/**
 * Cron diario: cancela reservas pendientes de pago que superaron el plazo.
 *
 * Política honesta: la fecha sólo queda retenida 2 horas (vigencia de la
 * preferencia de Mercado Pago). Pasado ese tiempo la fecha vuelve a ofrecerse;
 * la fila queda "pending_payment" unos días por si el cliente vuelve, y este
 * cron la cierra definitivamente y avisa por email.
 *
 * Orden por fila: marcar cancelada → borrar evento de calendario (si hubiera)
 * → email al cliente. Si el update falla, la fila se salta (no se manda nada).
 * Tope de 50 filas por corrida; procesamiento secuencial con un transporter pooled.
 */
import { checkCronAuth, supabaseAdmin, logError, json } from './_utils.js'
import { deleteCalendarEvent } from './_calendar.js'
import {
  escapeHtml, sendMail, emailShell, card, noteBox, ctaButton,
  formatDateRangeES, formatARS, shortId, SLOT_LABELS, CONTACT_LINE, RESERVE_URL,
  BUSINESS_EMAIL, BUSINESS_WHATSAPP,
} from './_email.js'
import { HOLD_MINUTES } from './_availability.js'

const AUTO_CANCEL_DAYS = 5
const BATCH_LIMIT = 50
const HOLD_HOURS = Math.round(HOLD_MINUTES / 60)

function isMissingColumnError(err) {
  return err && (err.code === '42703' || err.code === 'PGRST204')
}

/** Marca la reserva como cancelada (cancel_reason 'auto'; se tolera la base en Fase A). */
async function markCancelled(db, id) {
  const run = row => db.from('reservations').update(row).eq('id', id).eq('status', 'pending_payment').select('id')
  let result = await run({ status: 'cancelled', cancel_reason: 'auto' })
  if (result.error && isMissingColumnError(result.error)) {
    console.warn('[auto-cancel] cancel_reason no existe todavía (Fase A); se guarda sólo el status')
    result = await run({ status: 'cancelled' })
  }
  if (result.error) return { ok: false, error: result.error }
  return { ok: true, updated: (result.data || []).length }
}

function cancellationEmail(r) {
  const firstName = escapeHtml(r.first_name)
  const dateLabel = escapeHtml(formatDateRangeES(r.start_date, r.end_date || r.start_date))
  const slotLabel = escapeHtml(SLOT_LABELS[r.slot_type] || '')
  const bodyHtml = `
    ${card({
      title: 'Tu reserva no se completó',
      accentBorder: false,
      rows: [
        { label: 'Fecha solicitada', value: dateLabel, strong: true },
        { label: 'Horario', value: slotLabel },
        { label: 'Tipo de evento', value: escapeHtml(r.event_type) },
        { label: 'Seña que quedó sin abonar', value: escapeHtml(formatARS(r.deposit_amount)), separator: true },
      ],
    })}
    ${noteBox(`
      Hola <strong style="color:#f0f0f0">${firstName}</strong>: iniciaste una reserva para el
      <strong style="color:#f0f0f0">${dateLabel}</strong> pero la seña no se acreditó, así que la dimos de baja.
      <br><br>
      Cuando iniciás una reserva, la fecha queda retenida sólo <strong style="color:#f0f0f0">${HOLD_HOURS} horas</strong>
      (lo que dura el link de pago). Pasado ese tiempo vuelve a estar disponible para cualquier persona,
      por eso no podemos garantizarte que siga libre.
      <br><br>
      Si todavía te interesa el espacio, podés hacer una reserva nueva en un minuto o escribirnos y te ayudamos.
    `)}
    <div style="text-align:center;margin-bottom:1.5rem">
      ${ctaButton(RESERVE_URL, 'Hacer una nueva reserva')}
      <span style="display:inline-block;width:.75rem"></span>
      ${ctaButton(`https://wa.me/${BUSINESS_WHATSAPP}`, 'Escribirnos', { ghost: true })}
    </div>
    ${noteBox(CONTACT_LINE)}`
  return {
    subject: `Tu reserva para el ${formatDateRangeES(r.start_date, r.end_date || r.start_date)} no se completó`,
    html: emailShell({ title: 'Reserva no completada', bodyHtml, reservationId: r.id, preheader: 'La seña no se acreditó y la reserva se dio de baja.' }),
  }
}

function teamSummaryEmail(cancelled) {
  const trs = cancelled.map(r => `<tr>
      <td style="padding:.4rem .75rem;color:#999">${escapeHtml(r.first_name)} ${escapeHtml(r.last_name)}</td>
      <td style="padding:.4rem .75rem;color:#f0f0f0">${escapeHtml(formatDateRangeES(r.start_date, r.end_date || r.start_date))}</td>
      <td style="padding:.4rem .75rem;color:#999">${escapeHtml(r.email)}</td>
      <td style="padding:.4rem .75rem;color:#666">#${escapeHtml(shortId(r.id))}</td>
    </tr>`).join('')
  const bodyHtml = `
    <h2 style="color:#c8900a;font-family:Georgia,serif;margin:0 0 .4rem">Cancelaciones automáticas por falta de pago</h2>
    <p style="color:#999;margin:0 0 1.5rem">Estas reservas superaron los ${AUTO_CANCEL_DAYS} días sin abonar la seña y se cerraron:</p>
    <div style="background:#111;border:1px solid #222;border-radius:12px;padding:1rem;overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:.9rem">
        <thead><tr style="border-bottom:1px solid #333">
          <th style="padding:.4rem .75rem;text-align:left;color:#999">Cliente</th>
          <th style="padding:.4rem .75rem;text-align:left;color:#999">Fecha evento</th>
          <th style="padding:.4rem .75rem;text-align:left;color:#999">Email</th>
          <th style="padding:.4rem .75rem;text-align:left;color:#999">Reserva</th>
        </tr></thead>
        <tbody>${trs}</tbody>
      </table>
    </div>`
  return {
    subject: `🗑️ ${cancelled.length} reserva(s) cancelada(s) automáticamente`,
    html: emailShell({ title: 'Cancelaciones automáticas', bodyHtml }),
  }
}

export default async function handler(req, res) {
  const auth = checkCronAuth(req)
  if (!auth.ok) return json(res, { error: auth.message }, auth.status)

  let db
  try {
    db = supabaseAdmin()
  } catch (err) {
    logError('auto-cancel:config', err)
    return json(res, { error: 'Server misconfiguration' }, 500)
  }

  const cutoff = new Date(Date.now() - AUTO_CANCEL_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data: reservations, error } = await db
    .from('reservations')
    .select('id, first_name, last_name, email, event_type, start_date, end_date, slot_type, deposit_amount, calendar_event_id, created_at')
    .eq('status', 'pending_payment')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(BATCH_LIMIT)

  if (error) {
    logError('auto-cancel:db', error)
    return json(res, { error: 'DB error' }, 500)
  }
  if (!reservations || reservations.length === 0) {
    return json(res, { cancelled: 0, failed: 0, emailed: 0, remaining: 0 })
  }

  const cancelled = []
  let failed = 0
  let emailed = 0
  let calendarFailed = 0

  for (const r of reservations) {
    try {
      // 1. Marcar primero: si falla, no se manda nada.
      const mark = await markCancelled(db, r.id)
      if (!mark.ok) {
        failed++
        logError('auto-cancel:update', mark.error, { reservationId: r.id })
        continue
      }
      if (!mark.updated) continue // otra corrida/admin ya la cerró

      // 2. Calendario (una pendiente no debería tener evento, pero por las dudas)
      if (r.calendar_event_id) {
        const del = await deleteCalendarEvent(r.calendar_event_id)
        if (del.ok) {
          await db.from('reservations').update({ calendar_event_id: null }).eq('id', r.id)
        } else {
          calendarFailed++
        }
      }

      // 3. Email al cliente
      const mail = cancellationEmail(r)
      const sent = await sendMail({ to: r.email, subject: mail.subject, html: mail.html })
      if (sent.ok) emailed++
      cancelled.push(r)
      console.log(`[auto-cancel] cancelada ${r.id} (email ${sent.ok ? 'ok' : 'falló'})`)
    } catch (err) {
      failed++
      logError('auto-cancel:row', err, { reservationId: r.id })
    }
  }

  if (cancelled.length && BUSINESS_EMAIL) {
    const summary = teamSummaryEmail(cancelled)
    const sent = await sendMail({ to: BUSINESS_EMAIL, subject: summary.subject, html: summary.html, fromName: 'Sistema de Reservas' })
    if (!sent.ok) console.warn('[auto-cancel] no se pudo enviar el resumen al equipo')
  }

  return json(res, {
    cancelled: cancelled.length,
    failed,
    emailed,
    calendarFailed,
    remaining: reservations.length === BATCH_LIMIT ? 'possibly more' : 0,
  })
}
