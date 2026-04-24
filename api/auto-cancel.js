import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import nodemailer from 'nodemailer'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const AUTO_CANCEL_DAYS = 5

function formatDateES(dateStr) {
  const [year, month, day] = dateStr.split('-')
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`
}

async function deleteCalendarEvent(eventId) {
  try {
    const serviceAccount = JSON.parse(
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY
    )
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    })
    const calendar = google.calendar({ version: 'v3', auth })
    await calendar.events.delete({ calendarId: process.env.GOOGLE_CALENDAR_ID, eventId })
  } catch (err) {
    console.error('[auto-cancel] Calendar delete error:', err.message)
  }
}

async function sendCancellationEmail(reservation) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
  })

  const dateLabel = reservation.start_date === reservation.end_date
    ? formatDateES(reservation.start_date)
    : `${formatDateES(reservation.start_date)} al ${formatDateES(reservation.end_date)}`

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0a0a0a;color:#f0f0f0;font-family:'DM Sans',Arial,sans-serif;margin:0;padding:0">
  <div style="max-width:560px;margin:0 auto;padding:2rem 1.5rem">
    <div style="text-align:center;margin-bottom:2rem">
      <h1 style="font-family:Georgia,serif;font-size:2rem;color:#c8900a;margin-bottom:0.5rem">Espacio Auditorium</h1>
      <div style="width:60px;height:2px;background:#c8900a;margin:0 auto"></div>
    </div>

    <div style="background:#111;border:1px solid #333;border-radius:12px;padding:2rem;margin-bottom:1.5rem">
      <h2 style="font-family:Georgia,serif;font-size:1.3rem;margin-bottom:0.75rem">Tu reserva fue cancelada</h2>
      <p style="color:#888;font-size:0.9rem;line-height:1.7;margin-bottom:1rem">
        Hola <strong style="color:#f0f0f0">${reservation.first_name}</strong>, tu reserva para el
        <strong style="color:#f0f0f0">${dateLabel}</strong> fue cancelada automáticamente
        porque la seña no fue abonada dentro del plazo de ${AUTO_CANCEL_DAYS} días.
      </p>
      <p style="color:#888;font-size:0.9rem;line-height:1.7;margin:0">
        La fecha volvió a estar disponible. Si todavía te interesa el espacio,
        podés hacer una nueva reserva o contactarnos directamente.
      </p>
    </div>

    <div style="text-align:center;margin-bottom:1.5rem">
      <a href="https://espacioauditorium.com.ar/reservar"
         style="display:inline-block;background:#c8900a;color:#000;font-weight:700;text-decoration:none;padding:0.85rem 2rem;border-radius:8px;font-size:0.95rem;margin-right:0.75rem">
        Nueva reserva
      </a>
      <a href="https://wa.me/5491138255877"
         style="display:inline-block;background:transparent;color:#c8900a;font-weight:700;text-decoration:none;padding:0.85rem 2rem;border-radius:8px;font-size:0.95rem;border:1px solid #c8900a">
        Contactar
      </a>
    </div>

    <p style="text-align:center;color:#444;font-size:0.75rem;margin-top:2rem">
      Reserva #${reservation.id.split('-')[0].toUpperCase()} · Espacio Auditorium · Buenos Aires, Argentina
    </p>
  </div>
</body>
</html>`

  await transporter.sendMail({
    from: `"Espacio Auditorium" <${process.env.EMAIL_USER}>`,
    to: reservation.email,
    subject: `Reserva cancelada — ${dateLabel}`,
    html,
  })
}

async function notifyTeam(cancelled) {
  if (!cancelled.length) return
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
  })

  const rows = cancelled.map(r => {
    const dateLabel = r.start_date === r.end_date
      ? formatDateES(r.start_date)
      : `${formatDateES(r.start_date)} al ${formatDateES(r.end_date)}`
    return `<tr>
      <td style="padding:0.4rem 0.75rem;color:#888">${r.first_name} ${r.last_name}</td>
      <td style="padding:0.4rem 0.75rem">${dateLabel}</td>
      <td style="padding:0.4rem 0.75rem;color:#888">${r.email}</td>
    </tr>`
  }).join('')

  await transporter.sendMail({
    from: `"Sistema de Reservas" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_USER,
    subject: `🗑️ ${cancelled.length} reserva(s) cancelada(s) automáticamente`,
    html: `
<body style="background:#0a0a0a;color:#f0f0f0;font-family:Arial,sans-serif;padding:2rem">
  <h2 style="color:#c8900a">Cancelaciones automáticas por falta de pago</h2>
  <p style="color:#888">Las siguientes reservas superaron los ${AUTO_CANCEL_DAYS} días sin abonar la seña:</p>
  <table style="width:100%;border-collapse:collapse;font-size:0.9rem">
    <thead><tr style="border-bottom:1px solid #333">
      <th style="padding:0.4rem 0.75rem;text-align:left;color:#888">Cliente</th>
      <th style="padding:0.4rem 0.75rem;text-align:left;color:#888">Fecha evento</th>
      <th style="padding:0.4rem 0.75rem;text-align:left;color:#888">Email</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>`,
  })
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const cutoff = new Date(Date.now() - AUTO_CANCEL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('status', 'pending_payment')
    .lt('created_at', cutoff)

  if (error) {
    console.error('[auto-cancel] DB error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!reservations || reservations.length === 0) {
    return res.status(200).json({ cancelled: 0 })
  }

  const cancelled = []
  const failed = []

  for (const r of reservations) {
    try {
      if (r.calendar_event_id) await deleteCalendarEvent(r.calendar_event_id)

      await supabase
        .from('reservations')
        .update({ status: 'cancelled' })
        .eq('id', r.id)

      await sendCancellationEmail(r)
      cancelled.push(r)
      console.log(`[auto-cancel] Cancelled ${r.id} (${r.email})`)
    } catch (err) {
      failed.push(r.id)
      console.error(`[auto-cancel] Failed for ${r.id}:`, err.message)
    }
  }

  await notifyTeam(cancelled)

  return res.status(200).json({ cancelled: cancelled.length, failed: failed.length })
}
