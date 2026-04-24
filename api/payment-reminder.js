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

async function sendPaymentReminderEmail(reservation) {
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
      <h2 style="font-family:Georgia,serif;font-size:1.3rem;margin-bottom:0.75rem">Tu reserva está pendiente de confirmación</h2>
      <p style="color:#888;font-size:0.9rem;line-height:1.7;margin-bottom:1.5rem">
        Hola <strong style="color:#f0f0f0">${reservation.first_name}</strong>, notamos que iniciaste una reserva
        para el <strong style="color:#c8900a">${dateLabel}</strong> pero todavía no se acreditó la seña.
      </p>
      <p style="color:#888;font-size:0.9rem;line-height:1.7;margin-bottom:1.5rem">
        La fecha queda reservada temporalmente, pero para confirmarla necesitamos que abones la seña del 30%.
      </p>

      <table style="width:100%;font-size:0.9rem;border-collapse:collapse">
        <tr><td style="color:#888;padding:0.4rem 0">Fecha del evento</td><td style="text-align:right;font-weight:600;color:#f0f0f0">${dateLabel}</td></tr>
        <tr><td style="color:#888;padding:0.4rem 0">Tipo de evento</td><td style="text-align:right;color:#f0f0f0">${reservation.event_type}</td></tr>
        <tr style="border-top:1px solid #222">
          <td style="color:#888;padding:0.75rem 0 0.4rem">Seña a abonar (30%)</td>
          <td style="text-align:right;color:#c8900a;font-weight:700;font-size:1.2rem;padding-top:0.75rem">${formatARS(reservation.deposit_amount)}</td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin-bottom:1.5rem">
      <a href="https://espacioauditorium.com.ar/reservar"
         style="display:inline-block;background:#c8900a;color:#000;font-weight:700;text-decoration:none;padding:0.85rem 2rem;border-radius:8px;font-size:0.95rem">
        Completar reserva
      </a>
    </div>

    <div style="background:#111;border:1px solid #222;border-radius:12px;padding:1.5rem;margin-bottom:1.5rem">
      <p style="color:#888;font-size:0.88rem;line-height:1.8;margin:0">
        ¿Tenés alguna duda o necesitás ayuda con el pago?
        Escribinos por WhatsApp al
        <a href="https://wa.me/5491138255877" style="color:#c8900a">+54 11 3825-5877</a>
        o a <a href="mailto:espacioauditorium@gmail.com" style="color:#c8900a">espacioauditorium@gmail.com</a>
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
    subject: `⏳ Tu reserva para el ${dateLabel} está pendiente de pago`,
    html,
  })
}

export default async function handler(req, res) {
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  // Reservas pending de más de 48h que aún no recibieron recordatorio
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('*')
    .eq('status', 'pending_payment')
    .lt('created_at', cutoff)
    .is('payment_reminder_sent_at', null)

  if (error) {
    console.error('[payment-reminder] DB error:', error)
    return res.status(500).json({ error: error.message })
  }

  if (!reservations || reservations.length === 0) {
    return res.status(200).json({ sent: 0 })
  }

  let sent = 0
  let failed = 0

  for (const r of reservations) {
    try {
      await sendPaymentReminderEmail(r)
      await supabase
        .from('reservations')
        .update({ payment_reminder_sent_at: new Date().toISOString() })
        .eq('id', r.id)
      sent++
      console.log(`[payment-reminder] Sent to ${r.email} (${r.id})`)
    } catch (err) {
      failed++
      console.error(`[payment-reminder] Failed for ${r.email}:`, err.message)
    }
  }

  return res.status(200).json({ sent, failed })
}
