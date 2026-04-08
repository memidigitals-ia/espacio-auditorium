import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function formatDateES(dateStr) {
  const [year, month, day] = dateStr.split('-')
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${parseInt(day)} de ${months[parseInt(month) - 1]} de ${year}`
}

function formatARS(amount) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount)
}

function getTargetDate() {
  const d = new Date()
  d.setDate(d.getDate() + 5)
  return d.toISOString().split('T')[0]
}

async function sendReminderEmail(reservation) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
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

    <div style="background:#111;border:1px solid rgba(200,144,10,0.3);border-radius:12px;padding:2rem;margin-bottom:1.5rem">
      <h2 style="font-family:Georgia,serif;font-size:1.3rem;margin-bottom:0.5rem">Recordatorio de saldo pendiente</h2>
      <p style="color:#888;font-size:0.9rem;margin-bottom:1.5rem">
        Hola <strong style="color:#f0f0f0">${reservation.first_name}</strong>, te recordamos que tu evento es en <strong style="color:#c8900a">5 días</strong> y hay un saldo pendiente de pago.
      </p>

      <table style="width:100%;font-size:0.9rem;border-collapse:collapse">
        <tr><td style="color:#888;padding:0.4rem 0">Fecha del evento</td><td style="text-align:right;font-weight:600;color:#f0f0f0">${dateLabel}</td></tr>
        <tr><td style="color:#888;padding:0.4rem 0">Tipo de evento</td><td style="text-align:right;color:#f0f0f0">${reservation.event_type}</td></tr>
        <tr style="border-top:1px solid #222">
          <td style="color:#888;padding:0.75rem 0 0.4rem">Saldo a abonar</td>
          <td style="text-align:right;color:#c8900a;font-weight:700;font-size:1.2rem;padding-top:0.75rem">${formatARS(reservation.balance_amount)}</td>
        </tr>
      </table>
    </div>

    <div style="background:#111;border:1px solid #222;border-radius:12px;padding:1.5rem;margin-bottom:1.5rem">
      <p style="color:#888;font-size:0.88rem;line-height:1.8;margin:0">
        El saldo debe abonarse <strong style="color:#f0f0f0">antes del evento</strong>.
        Ante cualquier consulta escribinos a
        <a href="mailto:espacioauditorium@gmail.com" style="color:#c8900a">espacioauditorium@gmail.com</a>
        o por WhatsApp.
      </p>
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
    subject: `⏰ Recordatorio: saldo pendiente para tu evento del ${dateLabel}`,
    html,
  })
}

export default async function handler(req, res) {
  // Verificación de seguridad: solo Vercel Cron o llamada con secret
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const targetDate = getTargetDate()

  // Buscar reservas confirmadas con evento en 5 días
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('status', 'deposit_paid')
    .eq('start_date', targetDate)

  if (error) {
    console.error('send-reminders error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!reservations || reservations.length === 0) {
    return res.status(200).json({ sent: 0, date: targetDate })
  }

  const results = await Promise.allSettled(
    reservations.map(r => sendReminderEmail(r))
  )

  const sent = results.filter(r => r.status === 'fulfilled').length
  const failed = results.filter(r => r.status === 'rejected').length

  console.log(`Reminders: ${sent} sent, ${failed} failed for date ${targetDate}`)
  return res.status(200).json({ sent, failed, date: targetDate })
}
