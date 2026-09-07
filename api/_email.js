/**
 * Envío de emails (Gmail SMTP via Nodemailer) y plantillas.
 * TODO valor que venga del usuario se escapa con escapeHtml antes de entrar al HTML.
 */
import nodemailer from 'nodemailer'
import { escapeHtml, logError, APP_URL } from './_utils.js'
import { isEmail } from './_validate.js'

export { escapeHtml }

export const BUSINESS_EMAIL = (process.env.EMAIL_USER || '').trim()
export const BUSINESS_WHATSAPP = (process.env.HUMAN_WHATSAPP_NUMBER || '5491138255877').replace(/\D/g, '')
export const BUSINESS_WHATSAPP_PRETTY = '+54 11 3825-5877'

export const SLOT_LABELS = {
  full_day: 'Jornada completa (8:00–22:00)',
  half_day_morning: 'Media jornada mañana (8:00–13:00)',
  half_day_afternoon: 'Media jornada tarde/noche (14:00–22:00)',
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function formatDateES(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return ''
  const [year, month, day] = dateStr.split('-')
  return `${parseInt(day, 10)} de ${MONTHS[parseInt(month, 10) - 1] || ''} de ${year}`
}

export function formatDateRangeES(start, end) {
  return !end || end === start ? formatDateES(start) : `${formatDateES(start)} al ${formatDateES(end)}`
}

export function formatARS(amount) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(amount) || 0)
}

export function shortId(id) {
  return String(id || '').split('-')[0].toUpperCase()
}

/** Quita saltos de línea (inyección de headers) y recorta. */
export function sanitizeHeader(s, max = 200) {
  return String(s ?? '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max)
}

let _transporter = null
export function getTransporter() {
  if (_transporter) return _transporter
  const user = BUSINESS_EMAIL
  const pass = (process.env.EMAIL_APP_PASSWORD || '').trim()
  if (!user || !pass) throw new Error('EMAIL_USER / EMAIL_APP_PASSWORD no configurados')
  _transporter = nodemailer.createTransport({
    service: 'gmail',
    pool: true,
    maxConnections: 2,
    auth: { user, pass },
    connectionTimeout: 10000,
    socketTimeout: 15000,
  })
  return _transporter
}

/**
 * Envía un email. `to` debe ser UNA dirección válida (nunca listas del usuario).
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
export async function sendMail({ to, subject, html, fromName = 'Espacio Auditorium', replyTo }) {
  if (!isEmail(String(to || ''))) return { ok: false, error: 'destinatario inválido' }
  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: `"${sanitizeHeader(fromName, 60).replace(/"/g, '')}" <${BUSINESS_EMAIL}>`,
      to,
      replyTo: replyTo && isEmail(replyTo) ? replyTo : undefined,
      subject: sanitizeHeader(subject, 150),
      html,
    })
    return { ok: true }
  } catch (err) {
    logError('email', err, { to: to.replace(/^(.).*(@.*)$/, '$1***$2') })
    return { ok: false, error: err.message }
  }
}

// ---------------------------------------------------------------------------
// Plantillas (tema oscuro, tipografía de sistema). Valores YA escapados.
// ---------------------------------------------------------------------------
export function emailShell({ title, bodyHtml, reservationId, preheader = '' }) {
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="background:#0a0a0a;color:#f0f0f0;font-family:'DM Sans',Arial,Helvetica,sans-serif;margin:0;padding:0">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>` : ''}
  <div style="max-width:560px;margin:0 auto;padding:2rem 1.5rem">
    <div style="text-align:center;margin-bottom:2rem">
      <h1 style="font-family:Georgia,serif;font-size:2rem;color:#c8900a;margin:0 0 .5rem">Espacio Auditorium</h1>
      <div style="width:60px;height:2px;background:#c8900a;margin:0 auto"></div>
    </div>
    ${bodyHtml}
    <p style="text-align:center;color:#666;font-size:.75rem;margin-top:2rem">
      ${reservationId ? `Reserva #${escapeHtml(shortId(reservationId))} · ` : ''}Espacio Auditorium · Marcelo T. de Alvear 2153, Recoleta, Buenos Aires
    </p>
  </div>
</body>
</html>`
}

/** Tarjeta con filas label/valor. rows: [{label, value, accent?, strong?}] (value ya escapado o seguro). */
export function card({ title, subtitle, rows = [], accentBorder = true }) {
  const trs = rows.map((r) => {
    const top = r.separator ? 'border-top:1px solid #222;padding-top:.75rem' : ''
    const valStyle = `text-align:right;${r.accent ? 'color:#c8900a;font-weight:700;font-size:1.1rem;' : ''}${r.strong ? 'font-weight:600;' : ''}color:${r.accent ? '#c8900a' : '#f0f0f0'}`
    return `<tr><td style="color:#999;padding:.4rem 0;${top}">${escapeHtml(r.label)}</td><td style="padding:.4rem 0;${top};${valStyle}">${r.value}</td></tr>`
  }).join('')
  return `<div style="background:#111;border:1px solid ${accentBorder ? 'rgba(200,144,10,0.3)' : '#222'};border-radius:12px;padding:1.5rem 2rem;margin-bottom:1.5rem">
    ${title ? `<h2 style="font-family:Georgia,serif;font-size:1.3rem;margin:0 0 .4rem;color:#f0f0f0">${escapeHtml(title)}</h2>` : ''}
    ${subtitle ? `<p style="color:#999;margin:0 0 1.25rem;font-size:.9rem">${escapeHtml(subtitle)}</p>` : ''}
    ${rows.length ? `<table style="width:100%;font-size:.9rem;border-collapse:collapse">${trs}</table>` : ''}
  </div>`
}

export function noteBox(html) {
  return `<div style="background:#111;border:1px solid #222;border-radius:12px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;color:#bbb;font-size:.88rem;line-height:1.8">${html}</div>`
}

export function ctaButton(href, label, { ghost = false } = {}) {
  const style = ghost
    ? 'display:inline-block;background:transparent;color:#c8900a;font-weight:700;text-decoration:none;padding:.85rem 2rem;border-radius:8px;font-size:.95rem;border:1px solid #c8900a'
    : 'display:inline-block;background:#c8900a;color:#000;font-weight:700;text-decoration:none;padding:.85rem 2rem;border-radius:8px;font-size:.95rem'
  return `<a href="${escapeHtml(href)}" style="${style}">${escapeHtml(label)}</a>`
}

export const CONTACT_LINE = `Ante cualquier consulta escribinos a <a href="mailto:${escapeHtml(BUSINESS_EMAIL || 'espacioauditorium@gmail.com')}" style="color:#c8900a">${escapeHtml(BUSINESS_EMAIL || 'espacioauditorium@gmail.com')}</a> o por WhatsApp al <a href="https://wa.me/${BUSINESS_WHATSAPP}" style="color:#c8900a">${BUSINESS_WHATSAPP_PRETTY}</a>.`

export const RESERVE_URL = `${APP_URL}/reservar`
