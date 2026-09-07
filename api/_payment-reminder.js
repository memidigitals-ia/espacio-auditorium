/**
 * Cron diario: recordatorio a reservas pendientes de pago con más de 48 h.
 *
 * Copy honesto: la fecha NO queda retenida (el hold dura sólo 2 h, lo que vive
 * el link de pago). Se le dice al cliente que "sigue disponible por ahora" y se
 * lo manda a /reservar para generar un pago nuevo.
 *
 * Orden por fila: marcar payment_reminder_sent_at → enviar. Si el update falla,
 * la fila se salta. Tope de 50 filas por corrida, envío secuencial.
 */
import { checkCronAuth, supabaseAdmin, logError, json } from './_utils.js'
import {
  escapeHtml, sendMail, emailShell, card, noteBox, ctaButton,
  formatDateRangeES, formatARS, SLOT_LABELS, CONTACT_LINE, RESERVE_URL,
} from './_email.js'
import { HOLD_MINUTES } from './_availability.js'

const REMINDER_AFTER_HOURS = 48
const BATCH_LIMIT = 50
const HOLD_HOURS = Math.round(HOLD_MINUTES / 60)

function reminderEmail(r) {
  const firstName = escapeHtml(r.first_name)
  const dateLabel = escapeHtml(formatDateRangeES(r.start_date, r.end_date || r.start_date))
  const slotLabel = escapeHtml(SLOT_LABELS[r.slot_type] || '')
  const deposit = escapeHtml(formatARS(r.deposit_amount))
  const reserveLink = `${RESERVE_URL}?from=${encodeURIComponent(r.start_date)}`
  const bodyHtml = `
    ${card({
      title: 'Tu reserva quedó sin confirmar',
      subtitle: 'Todavía no se acreditó la seña.',
      rows: [
        { label: 'Fecha del evento', value: dateLabel, strong: true },
        { label: 'Horario', value: slotLabel },
        { label: 'Tipo de evento', value: escapeHtml(r.event_type) },
        { label: 'Seña a abonar (30%)', value: deposit, accent: true, separator: true },
      ],
    })}
    ${noteBox(`
      Hola <strong style="color:#f0f0f0">${firstName}</strong>: iniciaste una reserva para el
      <strong style="color:#c8900a">${dateLabel}</strong> pero la seña no llegó a acreditarse.
      <br><br>
      <strong style="color:#f0f0f0">La fecha sigue disponible por ahora; para asegurarla completá la seña.</strong>
      Tené en cuenta que la fecha sólo queda retenida <strong style="color:#f0f0f0">${HOLD_HOURS} horas</strong> desde que
      iniciás el pago: como ese plazo ya pasó, cualquier persona podría reservarla antes que vos.
      <br><br>
      El link de pago original venció. Volvé a elegir la fecha y generá uno nuevo en un minuto:
    `)}
    <div style="text-align:center;margin-bottom:1.5rem">${ctaButton(reserveLink, 'Completar la reserva')}</div>
    ${noteBox(`¿Tenés alguna duda o necesitás ayuda con el pago? ${CONTACT_LINE}`)}`
  return {
    subject: `⏳ Tu reserva para el ${formatDateRangeES(r.start_date, r.end_date || r.start_date)} quedó sin confirmar`,
    html: emailShell({ title: 'Reserva sin confirmar', bodyHtml, reservationId: r.id, preheader: 'La fecha sigue disponible por ahora; completá la seña para asegurarla.' }),
  }
}

export default async function handler(req, res) {
  const auth = checkCronAuth(req)
  if (!auth.ok) return json(res, { error: auth.message }, auth.status)

  let db
  try {
    db = supabaseAdmin()
  } catch (err) {
    logError('payment-reminder:config', err)
    return json(res, { error: 'Server misconfiguration' }, 500)
  }

  const cutoff = new Date(Date.now() - REMINDER_AFTER_HOURS * 60 * 60 * 1000).toISOString()
  const { data: reservations, error } = await db
    .from('reservations')
    .select('id, first_name, email, event_type, start_date, end_date, slot_type, deposit_amount, created_at')
    .eq('status', 'pending_payment')
    .lt('created_at', cutoff)
    .is('payment_reminder_sent_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_LIMIT)

  if (error) {
    if (error.code === '42703') {
      console.error('[payment-reminder] falta la columna payment_reminder_sent_at: correr la migración de Fase A')
      return json(res, { error: 'Missing migration (payment_reminder_sent_at)' }, 500)
    }
    logError('payment-reminder:db', error)
    return json(res, { error: 'DB error' }, 500)
  }
  if (!reservations || reservations.length === 0) {
    return json(res, { sent: 0, failed: 0, skipped: 0, remaining: 0 })
  }

  let sent = 0
  let failed = 0
  let skipped = 0

  for (const r of reservations) {
    try {
      // 1. Marcar primero (condicional: sólo si nadie la marcó entre medio)
      const { data: marked, error: markErr } = await db
        .from('reservations')
        .update({ payment_reminder_sent_at: new Date().toISOString() })
        .eq('id', r.id)
        .eq('status', 'pending_payment')
        .is('payment_reminder_sent_at', null)
        .select('id')
      if (markErr) {
        failed++
        logError('payment-reminder:update', markErr, { reservationId: r.id })
        continue
      }
      if (!marked || !marked.length) {
        skipped++
        continue
      }

      // 2. Enviar
      const mail = reminderEmail(r)
      const result = await sendMail({ to: r.email, subject: mail.subject, html: mail.html })
      if (result.ok) {
        sent++
        console.log(`[payment-reminder] enviado ${r.id}`)
      } else {
        failed++
        console.error(`[payment-reminder] falló el envío para ${r.id}`)
      }
    } catch (err) {
      failed++
      logError('payment-reminder:row', err, { reservationId: r.id })
    }
  }

  return json(res, {
    sent,
    failed,
    skipped,
    remaining: reservations.length === BATCH_LIMIT ? 'possibly more' : 0,
  })
}
