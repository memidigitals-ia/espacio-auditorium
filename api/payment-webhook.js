import { MercadoPagoConfig, Payment } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import nodemailer from 'nodemailer'
import axios from 'axios'
import { handleOptions, json, error } from './_utils.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ---- Google Calendar ----
async function getCalendarClient() {
  const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })
  return google.calendar({ version: 'v3', auth })
}

async function blockCalendarDate(reservation) {
  try {
    const calendar = await getCalendarClient()
    const calendarId = process.env.GOOGLE_CALENDAR_ID

    // Build time strings with buffer
    const slotTimes = {
      full_day: { start: '07:30', end: '22:30' }, // 30min buffer each side
      half_day_morning: { start: '07:30', end: '13:30' },
      half_day_afternoon: { start: '13:30', end: '22:30' },
    }

    const times = slotTimes[reservation.slot_type] || slotTimes.full_day

    const startDateTime = `${reservation.start_date}T${times.start}:00`
    const endDateTime = `${reservation.end_date || reservation.start_date}T${times.end}:00`

    const eventName = `🔒 RESERVADO - ${reservation.first_name} ${reservation.last_name} · ${reservation.event_type}`

    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: eventName,
        description: [
          `Cliente: ${reservation.first_name} ${reservation.last_name}`,
          `Email: ${reservation.email}`,
          `WhatsApp: ${reservation.whatsapp}`,
          `Tipo evento: ${reservation.event_type}`,
          `Jornada: ${reservation.duration_type === 'half_day' ? 'Media jornada' : 'Jornada completa'}`,
          `Seña abonada: $${reservation.deposit_amount?.toLocaleString('es-AR')}`,
          `Total: $${reservation.total_price?.toLocaleString('es-AR')}`,
          `Reserva ID: ${reservation.id}`,
          reservation.notes ? `\nNotas: ${reservation.notes}` : '',
        ].filter(Boolean).join('\n'),
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Argentina/Buenos_Aires',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/Argentina/Buenos_Aires',
        },
        colorId: '11', // Red
      },
    })

    return event.data.id
  } catch (err) {
    console.error('Google Calendar error:', err.message)
    return null // Don't fail the whole flow
  }
}

// ---- Email ----
function getMailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  })
}

function formatDateES(dateStr) {
  const [year, month, day] = dateStr.split('-')
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`
}

function formatARS(amount) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
}

async function sendConfirmationEmails(reservation) {
  const transporter = getMailTransporter()

  const dateLabel = reservation.start_date === reservation.end_date
    ? formatDateES(reservation.start_date)
    : `${formatDateES(reservation.start_date)} al ${formatDateES(reservation.end_date)}`

  const slotLabel = {
    full_day: 'Jornada completa (8:00–22:00)',
    half_day_morning: 'Media jornada mañana (8:00–13:00)',
    half_day_afternoon: 'Media jornada tarde/noche (14:00–22:00)',
  }[reservation.slot_type] || ''

  // Email al cliente
  const clientHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0a0a0a;color:#f0f0f0;font-family:'DM Sans',Arial,sans-serif;margin:0;padding:0">
  <div style="max-width:560px;margin:0 auto;padding:2rem 1.5rem">
    <div style="text-align:center;margin-bottom:2rem">
      <h1 style="font-family:Georgia,serif;font-size:2rem;color:#c8900a;margin-bottom:0.5rem">Espacio Auditorium</h1>
      <div style="width:60px;height:2px;background:#c8900a;margin:0 auto"></div>
    </div>

    <div style="background:#111;border:1px solid rgba(200,144,10,0.3);border-radius:12px;padding:2rem;margin-bottom:1.5rem">
      <h2 style="font-family:Georgia,serif;font-size:1.4rem;margin-bottom:0.5rem">¡Tu reserva está confirmada!</h2>
      <p style="color:#888;margin-bottom:1.5rem;font-size:0.9rem">La seña fue procesada exitosamente.</p>

      <table style="width:100%;font-size:0.9rem;border-collapse:collapse">
        <tr><td style="color:#888;padding:0.4rem 0">Fecha del evento</td><td style="text-align:right;font-weight:600">${dateLabel}</td></tr>
        <tr><td style="color:#888;padding:0.4rem 0">Horario</td><td style="text-align:right">${slotLabel}</td></tr>
        <tr><td style="color:#888;padding:0.4rem 0">Tipo de evento</td><td style="text-align:right">${reservation.event_type}</td></tr>
        <tr style="border-top:1px solid #222">
          <td style="color:#888;padding:0.75rem 0 0.4rem">Seña abonada</td>
          <td style="text-align:right;color:#c8900a;font-weight:700;font-size:1.1rem;padding-top:0.75rem">${formatARS(reservation.deposit_amount)}</td>
        </tr>
        <tr>
          <td style="color:#888;padding:0.4rem 0">Saldo pendiente</td>
          <td style="text-align:right;font-weight:600">${formatARS(reservation.balance_amount)}</td>
        </tr>
      </table>
    </div>

    <div style="background:#111;border:1px solid #222;border-radius:12px;padding:1.5rem;margin-bottom:1.5rem">
      <h3 style="font-size:0.9rem;text-transform:uppercase;letter-spacing:0.05em;color:#c8900a;margin-bottom:1rem">Próximos pasos</h3>
      <ul style="color:#888;font-size:0.88rem;line-height:1.8;padding-left:1.2rem">
        <li>El saldo de <strong style="color:#f0f0f0">${formatARS(reservation.balance_amount)}</strong> debe abonarse <strong style="color:#f0f0f0">5 días antes</strong> del evento.</li>
        <li>Nos contactaremos con vos por WhatsApp para coordinar los detalles del evento.</li>
        <li>Ante cualquier consulta, escribinos a espacioauditorium@gmail.com o por WhatsApp al +54 11 3825-5877.</li>
      </ul>
    </div>

    <p style="text-align:center;color:#444;font-size:0.75rem;margin-top:2rem">
      Reserva #${reservation.id.split('-')[0].toUpperCase()} · Espacio Auditorium · Buenos Aires, Argentina
    </p>
  </div>
</body>
</html>`

  // Email al negocio
  const businessHtml = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body style="background:#0a0a0a;color:#f0f0f0;font-family:Arial,sans-serif;margin:0;padding:0">
  <div style="max-width:560px;margin:0 auto;padding:2rem 1.5rem">
    <h2 style="color:#c8900a;font-family:Georgia,serif">Nueva reserva confirmada 🎉</h2>
    <p style="color:#888;margin-bottom:1.5rem">Se acaba de confirmar una reserva con seña abonada.</p>

    <div style="background:#111;border:1px solid rgba(200,144,10,0.3);border-radius:12px;padding:1.5rem">
      <table style="width:100%;font-size:0.9rem;border-collapse:collapse">
        <tr><td style="color:#888;padding:0.4rem 0;width:40%">Cliente</td><td style="font-weight:600">${reservation.first_name} ${reservation.last_name}</td></tr>
        <tr><td style="color:#888;padding:0.4rem 0">Email</td><td>${reservation.email}</td></tr>
        <tr><td style="color:#888;padding:0.4rem 0">WhatsApp</td><td>${reservation.whatsapp}</td></tr>
        <tr><td style="color:#888;padding:0.4rem 0">Fecha</td><td style="font-weight:600">${dateLabel}</td></tr>
        <tr><td style="color:#888;padding:0.4rem 0">Horario</td><td>${slotLabel}</td></tr>
        <tr><td style="color:#888;padding:0.4rem 0">Tipo de evento</td><td>${reservation.event_type}</td></tr>
        ${reservation.notes ? `<tr><td style="color:#888;padding:0.4rem 0">Notas</td><td>${reservation.notes}</td></tr>` : ''}
        <tr style="border-top:1px solid #222">
          <td style="color:#888;padding:0.75rem 0 0.4rem">Seña recibida</td>
          <td style="color:#c8900a;font-weight:700;font-size:1.1rem;padding-top:0.75rem">${formatARS(reservation.deposit_amount)}</td>
        </tr>
        <tr>
          <td style="color:#888;padding:0.4rem 0">Saldo pendiente</td>
          <td style="font-weight:600">${formatARS(reservation.balance_amount)}</td>
        </tr>
        <tr>
          <td style="color:#888;padding:0.4rem 0">Total</td>
          <td style="font-weight:600">${formatARS(reservation.total_price)}</td>
        </tr>
      </table>
    </div>

    <p style="color:#444;font-size:0.78rem;margin-top:1.5rem">Reserva ID: ${reservation.id}</p>
  </div>
</body>
</html>`

  try {
    await Promise.allSettled([
      transporter.sendMail({
        from: `"Espacio Auditorium" <${process.env.EMAIL_USER}>`,
        to: reservation.email,
        subject: '✓ Reserva confirmada — Espacio Auditorium',
        html: clientHtml,
      }),
      transporter.sendMail({
        from: `"Sistema de Reservas" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: `🎉 Nueva reserva: ${reservation.first_name} ${reservation.last_name} · ${dateLabel}`,
        html: businessHtml,
      }),
    ])
  } catch (err) {
    console.error('Email error:', err.message)
  }
}

// ---- WhatsApp (CallMeBot) ----
async function sendWhatsAppNotification(reservation) {
  const phone = process.env.CALLMEBOT_PHONE
  const apikey = process.env.CALLMEBOT_APIKEY

  if (!phone || !apikey) return

  const dateLabel = reservation.start_date === reservation.end_date
    ? reservation.start_date
    : `${reservation.start_date} → ${reservation.end_date}`

  const message = [
    `🎉 *Nueva reserva confirmada*`,
    ``,
    `👤 ${reservation.first_name} ${reservation.last_name}`,
    `📅 ${dateLabel}`,
    `📋 ${reservation.event_type}`,
    `💰 Seña: $${Math.round(reservation.deposit_amount).toLocaleString('es-AR')}`,
    `📱 WhatsApp: ${reservation.whatsapp}`,
    `✉️ ${reservation.email}`,
  ].join('\n')

  try {
    await axios.get('https://api.callmebot.com/whatsapp.php', {
      params: {
        phone,
        text: message,
        apikey,
      },
      timeout: 10000,
    })
  } catch (err) {
    console.error('WhatsApp notification error:', err.message)
    // Non-fatal
  }
}

// ---- Main handler ----
export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return json(res, { ok: true }) // MP sends GET for verification

  try {
    const { type, data } = req.body

    if (type === 'payment') {
      const paymentId = data?.id
      if (!paymentId) return json(res, { ok: true })

      // Fetch payment from MP
      const mp = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN })
      const paymentClient = new Payment(mp)
      const payment = await paymentClient.get({ id: paymentId })

      if (payment.status !== 'approved') {
        return json(res, { ok: true, status: payment.status })
      }

      const reservationId = payment.external_reference
      if (!reservationId) return json(res, { ok: true })

      // Get reservation
      const { data: reservation, error: fetchError } = await supabase
        .from('reservations')
        .select('*')
        .eq('id', reservationId)
        .single()

      if (fetchError || !reservation) return json(res, { ok: true })

      // Already processed
      if (reservation.status === 'deposit_paid' || reservation.status === 'confirmed') {
        return json(res, { ok: true, skipped: true })
      }

      // Block calendar
      const calendarEventId = await blockCalendarDate(reservation)

      // Update reservation status
      await supabase
        .from('reservations')
        .update({
          status: 'deposit_paid',
          mp_payment_id: String(paymentId),
          deposit_paid_at: new Date().toISOString(),
          calendar_event_id: calendarEventId,
        })
        .eq('id', reservationId)

      const updatedReservation = { ...reservation, status: 'deposit_paid' }

      // Send notifications (parallel, non-blocking on errors)
      await Promise.allSettled([
        sendConfirmationEmails(updatedReservation),
        sendWhatsAppNotification(updatedReservation),
      ])

      return json(res, { ok: true, processed: true })
    }

    return json(res, { ok: true })
  } catch (err) {
    console.error('Webhook error:', err)
    // Always return 200 to MP so it doesn't retry
    return json(res, { ok: true, error: err.message })
  }
}
