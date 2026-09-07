/**
 * Cron diario: recordatorio de saldo pendiente 5 días antes del evento
 * (reservas con seña paga que todavía no fueron confirmadas como saldadas).
 *
 * Fecha objetivo calculada en hora de Buenos Aires. Tope de 50 filas por
 * corrida, envío secuencial con el transporter pooled de _email.js.
 * Respuesta JSON con conteos.
 */
import { checkCronAuth, supabaseAdmin, logError, json } from './_utils.js'
import { todayLocal, addDaysIso } from './_dates.js'
import {
  escapeHtml, sendMail, emailShell, card, noteBox,
  formatDateRangeES, formatARS, SLOT_LABELS, CONTACT_LINE,
} from './_email.js'

const DAYS_BEFORE = 5
const BATCH_LIMIT = 50

function balanceReminderEmail(r) {
  const firstName = escapeHtml(r.first_name)
  const dateLabel = escapeHtml(formatDateRangeES(r.start_date, r.end_date || r.start_date))
  const slotLabel = escapeHtml(SLOT_LABELS[r.slot_type] || '')
  const balance = escapeHtml(formatARS(r.balance_amount))
  const bodyHtml = `
    ${card({
      title: 'Recordatorio de saldo pendiente',
      subtitle: `Tu evento es en ${DAYS_BEFORE} días.`,
      rows: [
        { label: 'Fecha del evento', value: dateLabel, strong: true },
        { label: 'Horario', value: slotLabel },
        { label: 'Tipo de evento', value: escapeHtml(r.event_type) },
        { label: 'Seña abonada', value: escapeHtml(formatARS(r.deposit_amount)), separator: true },
        { label: 'Saldo a abonar', value: balance, accent: true },
      ],
    })}
    ${noteBox(`
      Hola <strong style="color:#f0f0f0">${firstName}</strong>: te recordamos que tu evento es en
      <strong style="color:#c8900a">${DAYS_BEFORE} días</strong> y queda un saldo pendiente de
      <strong style="color:#f0f0f0">${balance}</strong>, que debe abonarse <strong style="color:#f0f0f0">antes del evento</strong>.
      <br><br>
      Nos contactamos por WhatsApp para coordinar el pago y los detalles del día. ${CONTACT_LINE}
    `)}`
  return {
    subject: `⏰ Recordatorio: saldo pendiente para tu evento del ${formatDateRangeES(r.start_date, r.end_date || r.start_date)}`,
    html: emailShell({ title: 'Saldo pendiente', bodyHtml, reservationId: r.id, preheader: `Tu evento es en ${DAYS_BEFORE} días: queda un saldo de ${formatARS(r.balance_amount)}.` }),
  }
}

export default async function handler(req, res) {
  const auth = checkCronAuth(req)
  if (!auth.ok) return json(res, { error: auth.message }, auth.status)

  let db
  try {
    db = supabaseAdmin()
  } catch (err) {
    logError('send-reminders:config', err)
    return json(res, { error: 'Server misconfiguration' }, 500)
  }

  const targetDate = addDaysIso(todayLocal(), DAYS_BEFORE)
  const { data: reservations, error } = await db
    .from('reservations')
    .select('id, first_name, email, event_type, start_date, end_date, slot_type, deposit_amount, balance_amount, created_at')
    .eq('status', 'deposit_paid')
    .eq('start_date', targetDate)
    .order('created_at', { ascending: true })
    .limit(BATCH_LIMIT)

  if (error) {
    logError('send-reminders:db', error)
    return json(res, { error: 'DB error' }, 500)
  }
  if (!reservations || reservations.length === 0) {
    return json(res, { sent: 0, failed: 0, date: targetDate })
  }

  let sent = 0
  let failed = 0
  for (const r of reservations) {
    try {
      const mail = balanceReminderEmail(r)
      const result = await sendMail({ to: r.email, subject: mail.subject, html: mail.html })
      if (result.ok) {
        sent++
        console.log(`[send-reminders] enviado ${r.id}`)
      } else {
        failed++
        console.error(`[send-reminders] falló el envío para ${r.id}`)
      }
    } catch (err) {
      failed++
      logError('send-reminders:row', err, { reservationId: r.id })
    }
  }

  console.log(`[send-reminders] ${sent} enviados, ${failed} fallidos para ${targetDate}`)
  return json(res, { sent, failed, date: targetDate })
}
