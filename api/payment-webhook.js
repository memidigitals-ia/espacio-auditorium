/**
 * POST /api/payment-webhook — notificaciones de Mercado Pago.
 *
 * Contrato de respuesta (CONTRACTS §2):
 *   200 {ok:true}  → ignorada, ya procesada o procesada (cuerpo constante, sin estado interno)
 *   401 {ok:false} → firma inválida
 *   500 {ok:false} → error transitorio (MP o base caídos) para que MP reintente
 *
 * Seguridad real: además de la firma, SIEMPRE se re-consulta el pago en MP y se
 * verifica moneda, live_mode y monto contra la reserva antes de confirmarla.
 * Idempotencia: la fila se "reclama" con un update condicional
 * (status = pending_payment) y la exclusion constraint de la base es el árbitro
 * final ante dos pagos por la misma fecha.
 */
import crypto from 'crypto'
import { MercadoPagoConfig, Payment } from 'mercadopago'
import {
  handleOptions, cors, parseBody, supabaseAdmin, logError, requireEnv, APP_URL,
} from './_utils.js'
import { isUuid } from './_validate.js'
import { assertSlotAvailable } from './_availability.js'
import { createReservationEvent, deleteCalendarEvent } from './_calendar.js'
import {
  escapeHtml, sendMail, emailShell, card, noteBox, ctaButton,
  formatDateRangeES, formatARS, shortId, SLOT_LABELS, CONTACT_LINE, BUSINESS_EMAIL,
} from './_email.js'

const SIGNATURE_MAX_SKEW_MS = 5 * 60 * 1000
const DATA_ID_RE = /^\d{1,20}$/
const ACTIVE = ['deposit_paid', 'confirmed']

/** Columnas que existen recién con la migración de Fase B. */
const PHASE_B_COLUMNS = ['cancel_reason', 'calendar_sync_error', 'mp_transaction_amount', 'coupon_code', 'coupon_discount_pct']

// ---------------------------------------------------------------------------
// Respuestas constantes
// ---------------------------------------------------------------------------
function reply(res, status = 200) {
  cors(res)
  res.setHeader('Cache-Control', 'no-store')
  return res.status(status).json({ ok: status === 200 })
}

// ---------------------------------------------------------------------------
// Escrituras tolerantes a la base en Fase A
// ---------------------------------------------------------------------------
function isMissingColumnError(err) {
  return err && (err.code === '42703' || err.code === 'PGRST204')
}

function stripPhaseB(row) {
  const out = { ...row }
  for (const c of PHASE_B_COLUMNS) delete out[c]
  return out
}

/** Ejecuta `run(row)`; si faltan columnas de Fase B reintenta sin ellas. */
async function writeTolerant(run, row, context) {
  let result = await run(row)
  if (result.error && isMissingColumnError(result.error)) {
    console.warn(`[payment-webhook] ${context}: columnas de Fase B ausentes, reintentando sin ellas (${result.error.message})`)
    result = await run(stripPhaseB(row))
  }
  return result
}

/**
 * Cambio de estado que en Fase A puede violar el CHECK de status
 * (23514: 'refunded' / 'payment_conflict' no existen todavía) → cae a 'cancelled'.
 */
async function setStatusTolerant(db, id, fromStatuses, row, context) {
  const run = r => db.from('reservations').update(r).eq('id', id).in('status', fromStatuses).select('id')
  let result = await writeTolerant(run, row, context)
  if (result.error && result.error.code === '23514' && row.status !== 'cancelled') {
    console.warn(`[payment-webhook] ${context}: status '${row.status}' no admitido todavía (Fase A), se guarda 'cancelled'`)
    result = await writeTolerant(run, { ...row, status: 'cancelled' }, context)
  }
  return result
}

// ---------------------------------------------------------------------------
// Firma x-signature (manifest: id:<data.id>;request-id:<x-request-id>;ts:<ts>;)
// ---------------------------------------------------------------------------
function verifySignature(req, dataId) {
  const secret = (process.env.MP_WEBHOOK_SECRET || '').trim()
  if (!secret) {
    console.error('[payment-webhook] MP_WEBHOOK_SECRET no configurada: NO se valida la firma de Mercado Pago. Configurala en el panel de MP y en Vercel.')
    return { ok: true, skipped: true }
  }
  const header = req.headers['x-signature']
  const requestId = req.headers['x-request-id']
  if (typeof header !== 'string' || typeof requestId !== 'string' || !requestId) {
    return { ok: false, reason: 'faltan headers' }
  }
  const parts = {}
  for (const kv of header.split(',')) {
    const idx = kv.indexOf('=')
    if (idx > -1) parts[kv.slice(0, idx).trim()] = kv.slice(idx + 1).trim()
  }
  const { ts, v1 } = parts
  if (!ts || !v1 || !/^\d{1,16}$/.test(ts) || !/^[0-9a-f]{64}$/i.test(v1)) {
    return { ok: false, reason: 'formato inválido' }
  }
  // MP manda ts en segundos; se tolera milisegundos por si cambia.
  const tsNum = Number(ts)
  const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000
  if (Math.abs(Date.now() - tsMs) > SIGNATURE_MAX_SKEW_MS) {
    return { ok: false, reason: 'ts fuera de ventana' }
  }
  // Si data.id es alfanumérico va en minúsculas (spec de MP); los numéricos no cambian.
  const idPart = /^[a-zA-Z0-9]+$/.test(dataId) ? dataId.toLowerCase() : dataId
  const manifest = `id:${idPart};request-id:${requestId};ts:${ts};`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(v1, 'hex')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'hmac no coincide' }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Mercado Pago
// ---------------------------------------------------------------------------
async function fetchPayment(paymentId) {
  const { MP_ACCESS_TOKEN } = requireEnv(['MP_ACCESS_TOKEN'])
  const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN, options: { timeout: 10000 } })
  return new Payment(mp).get({ id: paymentId })
}

// ---------------------------------------------------------------------------
// waitUntil (Vercel) si está disponible; si no, se espera a las notificaciones.
// ---------------------------------------------------------------------------
async function runAfterResponse(task) {
  let waitUntil = null
  try {
    const moduleName = '@vercel/functions'
    const mod = await import(/* @vite-ignore */ moduleName)
    if (typeof mod.waitUntil === 'function') waitUntil = mod.waitUntil
  } catch {
    waitUntil = null
  }
  const promise = task().catch(err => logError('payment-webhook:after', err))
  if (waitUntil) {
    waitUntil(promise)
    return
  }
  await promise
}

// ---------------------------------------------------------------------------
// Emails y WhatsApp (todo campo del usuario pasa por escapeHtml)
// ---------------------------------------------------------------------------
function safeFields(r) {
  return {
    firstName: escapeHtml(r.first_name),
    lastName: escapeHtml(r.last_name),
    email: escapeHtml(r.email),
    whatsapp: escapeHtml(r.whatsapp),
    eventType: escapeHtml(r.event_type),
    notes: escapeHtml(r.notes || ''),
    dateLabel: escapeHtml(formatDateRangeES(r.start_date, r.end_date || r.start_date)),
    slotLabel: escapeHtml(SLOT_LABELS[r.slot_type] || ''),
    extraHours: Number(r.additional_hours) || 0,
    couponPct: Number(r.coupon_discount_pct) || 0,
    couponCode: escapeHtml(r.coupon_code || ''),
    deposit: escapeHtml(formatARS(r.deposit_amount)),
    balance: escapeHtml(formatARS(r.balance_amount)),
    total: escapeHtml(formatARS(r.total_price)),
  }
}

function statusPageUrl(r) {
  const qs = new URLSearchParams({ status: 'approved', reservation_id: String(r.id) })
  if (r.public_token) qs.set('t', String(r.public_token))
  return `${APP_URL}/pago?${qs.toString()}`
}

function clientConfirmationEmail(r) {
  const f = safeFields(r)
  const rows = [
    { label: 'Fecha del evento', value: f.dateLabel, strong: true },
    { label: 'Horario', value: f.slotLabel },
    { label: 'Tipo de evento', value: f.eventType },
  ]
  if (f.extraHours) rows.push({ label: 'Horas adicionales', value: String(f.extraHours) })
  if (f.couponPct) rows.push({ label: 'Cupón aplicado', value: `${f.couponCode ? f.couponCode + ' · ' : ''}${f.couponPct}% sobre la seña` })
  rows.push({ label: 'Seña abonada', value: f.deposit, accent: true, separator: true })
  rows.push({ label: 'Saldo pendiente', value: f.balance, strong: true })

  const bodyHtml = `
    ${card({ title: '¡Tu reserva está confirmada!', subtitle: 'La seña fue procesada exitosamente.', rows })}
    ${noteBox(`
      <h3 style="font-size:.9rem;text-transform:uppercase;letter-spacing:.05em;color:#c8900a;margin:0 0 1rem">Próximos pasos</h3>
      <ul style="margin:0;padding-left:1.2rem">
        <li>El saldo de <strong style="color:#f0f0f0">${f.balance}</strong> debe abonarse <strong style="color:#f0f0f0">5 días antes</strong> del evento.</li>
        <li>Nos contactaremos con vos por WhatsApp para coordinar los detalles del evento.</li>
        <li>${CONTACT_LINE}</li>
      </ul>`)}
    <div style="text-align:center;margin-bottom:1.5rem">${ctaButton(statusPageUrl(r), 'Ver mi reserva')}</div>`
  return {
    subject: '✓ Reserva confirmada — Espacio Auditorium',
    html: emailShell({ title: 'Reserva confirmada', bodyHtml, reservationId: r.id, preheader: `Tu reserva para el ${formatDateRangeES(r.start_date, r.end_date || r.start_date)} está confirmada.` }),
  }
}

function businessConfirmationEmail(r, { paymentId, calendarNote }) {
  const f = safeFields(r)
  const rows = [
    { label: 'Cliente', value: `${f.firstName} ${f.lastName}`, strong: true },
    { label: 'Email', value: f.email },
    { label: 'WhatsApp', value: f.whatsapp },
    { label: 'Fecha', value: f.dateLabel, strong: true },
    { label: 'Horario', value: f.slotLabel },
    { label: 'Tipo de evento', value: f.eventType },
  ]
  if (f.extraHours) rows.push({ label: 'Horas adicionales', value: String(f.extraHours) })
  if (f.notes) rows.push({ label: 'Notas', value: f.notes })
  if (f.couponPct) rows.push({ label: 'Cupón', value: `${f.couponCode || '—'} (${f.couponPct}% sobre la seña)` })
  rows.push({ label: 'Seña recibida', value: f.deposit, accent: true, separator: true })
  rows.push({ label: 'Saldo pendiente', value: f.balance, strong: true })
  rows.push({ label: 'Total', value: f.total, strong: true })
  rows.push({ label: 'Pago MP', value: escapeHtml(String(paymentId)) })

  const bodyHtml = `
    <h2 style="color:#c8900a;font-family:Georgia,serif;margin:0 0 .4rem">Nueva reserva confirmada 🎉</h2>
    <p style="color:#999;margin:0 0 1.5rem">Se acaba de confirmar una reserva con seña abonada.</p>
    ${card({ rows })}
    ${calendarNote ? noteBox(calendarNote) : ''}
    <p style="color:#666;font-size:.78rem">Reserva ID: ${escapeHtml(String(r.id))}</p>`
  return {
    subject: `🎉 Nueva reserva: ${r.first_name} ${r.last_name} · ${formatDateRangeES(r.start_date, r.end_date || r.start_date)}`,
    html: emailShell({ title: 'Nueva reserva confirmada', bodyHtml, reservationId: r.id }),
  }
}

function businessAlertEmail({ title, intro, r, extraRows = [], footer = '' }) {
  const f = safeFields(r)
  const rows = [
    { label: 'Cliente', value: `${f.firstName} ${f.lastName}`, strong: true },
    { label: 'Email', value: f.email },
    { label: 'WhatsApp', value: f.whatsapp },
    { label: 'Fecha', value: f.dateLabel, strong: true },
    { label: 'Horario', value: f.slotLabel },
    { label: 'Tipo de evento', value: f.eventType },
    { label: 'Seña esperada', value: f.deposit, accent: true, separator: true },
    ...extraRows,
  ]
  const bodyHtml = `
    <h2 style="color:#c8900a;font-family:Georgia,serif;margin:0 0 .4rem">${escapeHtml(title)}</h2>
    <p style="color:#999;margin:0 0 1.5rem">${intro}</p>
    ${card({ rows })}
    ${footer ? noteBox(footer) : ''}
    <p style="color:#666;font-size:.78rem">Reserva ID: ${escapeHtml(String(r.id))}</p>`
  return { subject: `⚠️ ${title} · #${shortId(r.id)}`, html: emailShell({ title, bodyHtml, reservationId: r.id }) }
}

function clientConflictEmail(r) {
  const f = safeFields(r)
  const bodyHtml = `
    ${card({
      title: 'Recibimos tu pago, pero la fecha ya no estaba disponible',
      subtitle: 'Nos comunicamos con vos a la brevedad para reintegrarte la seña o buscar otra fecha.',
      rows: [
        { label: 'Fecha solicitada', value: f.dateLabel, strong: true },
        { label: 'Horario', value: f.slotLabel },
        { label: 'Seña abonada', value: f.deposit, accent: true, separator: true },
      ],
    })}
    ${noteBox(`Hola ${f.firstName}: justo antes de que se acreditara tu seña otra reserva tomó esa fecha. No te preocupes: el importe se reintegra íntegramente o, si preferís, lo aplicamos a otra fecha. ${CONTACT_LINE}`)}`
  return {
    subject: 'Sobre tu reserva en Espacio Auditorium — necesitamos coordinar la fecha',
    html: emailShell({ title: 'Sobre tu reserva', bodyHtml, reservationId: r.id }),
  }
}

/** Aviso interno por WhatsApp (CallMeBot). Sólo nombre de pila e importe: sin datos de contacto. */
async function sendCallMeBot(r) {
  const phone = (process.env.CALLMEBOT_PHONE || '').trim()
  const apikey = (process.env.CALLMEBOT_APIKEY || '').trim()
  if (!phone || !apikey) return
  const dateLabel = r.start_date === (r.end_date || r.start_date) ? r.start_date : `${r.start_date} → ${r.end_date}`
  const text = [
    '🎉 *Nueva reserva confirmada*',
    '',
    `👤 ${String(r.first_name || '').slice(0, 40)}`,
    `📅 ${dateLabel}`,
    `📋 ${String(r.event_type || '').slice(0, 60)}`,
    `💰 Seña: $${Math.round(Number(r.deposit_amount) || 0).toLocaleString('es-AR')}`,
    `🔖 Reserva #${shortId(r.id)}`,
  ].join('\n')
  const url = `https://api.callmebot.com/whatsapp.php?${new URLSearchParams({ phone, text, apikey }).toString()}`
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!resp.ok) console.warn(`[payment-webhook] CallMeBot respondió ${resp.status}`)
  } catch (err) {
    logError('payment-webhook:callmebot', err)
  }
}

async function notifyBusiness(email) {
  if (!BUSINESS_EMAIL) {
    console.error('[payment-webhook] EMAIL_USER no configurado: no se puede avisar al negocio')
    return { ok: false }
  }
  return sendMail({ to: BUSINESS_EMAIL, subject: email.subject, html: email.html, fromName: 'Sistema de Reservas' })
}

// ---------------------------------------------------------------------------
// Pago aprobado
// ---------------------------------------------------------------------------
async function markConflict(db, reservation, payment, reason) {
  const paymentId = String(payment.id)
  const { error } = await setStatusTolerant(db, reservation.id, ['pending_payment'], {
    status: 'payment_conflict',
    cancel_reason: reason,
    mp_payment_id: paymentId,
    mp_transaction_amount: payment.transaction_amount ?? null,
  }, `conflict:${reason}`)
  if (error) {
    // 23505: este pago ya confirmó otra fila (índice único de mp_payment_id) → nada que hacer.
    if (error.code === '23505') return { ok: true, duplicate: true }
    throw error
  }
  return { ok: true }
}

async function handleApproved({ db, reservation, payment, res }) {
  const paymentId = String(payment.id)
  const amount = Number(payment.transaction_amount)
  const expected = Number(reservation.deposit_amount)
  const allowTest = process.env.MP_ALLOW_TEST_PAYMENTS === 'true'

  // Ya procesada / cancelada: nada que hacer (idempotente)
  if (reservation.status !== 'pending_payment') {
    if (!ACTIVE.includes(reservation.status) && reservation.mp_payment_id !== paymentId) {
      // Pago aprobado sobre una reserva que ya no está pendiente (cancelada/vencida): plata sin reserva.
      console.error(`[payment-webhook] pago ${paymentId} aprobado para reserva ${reservation.id} en estado ${reservation.status}`)
      await notifyBusiness(businessAlertEmail({
        title: 'Pago recibido para una reserva ya cerrada',
        intro: `Mercado Pago acreditó un pago para una reserva en estado <strong>${escapeHtml(reservation.status)}</strong>. Hay que revisar y, si corresponde, devolver la seña.`,
        r: reservation,
        extraRows: [
          { label: 'Monto acreditado', value: escapeHtml(formatARS(amount)) },
          { label: 'Pago MP', value: escapeHtml(paymentId) },
        ],
      }))
    }
    return reply(res, 200)
  }

  if (payment.live_mode !== true && !allowTest) {
    console.error(`[payment-webhook] pago ${paymentId} en modo prueba (live_mode=false) para reserva ${reservation.id}: ignorado`)
    await notifyBusiness(businessAlertEmail({
      title: 'Pago de prueba recibido en producción',
      intro: 'Llegó un pago con <strong>live_mode=false</strong>. No se confirmó la reserva. Si es una prueba tuya, ignoralo.',
      r: reservation,
      extraRows: [{ label: 'Pago MP', value: escapeHtml(paymentId) }],
    }))
    return reply(res, 200)
  }

  let conflictReason = null
  if (payment.currency_id !== 'ARS') conflictReason = 'currency_mismatch'
  else if (!Number.isFinite(amount) || Math.abs(amount - expected) >= 1) conflictReason = 'amount_mismatch'

  if (conflictReason) {
    console.error(`[payment-webhook] ${conflictReason}: pago ${paymentId} ${payment.currency_id} ${amount} vs esperado ARS ${expected} (reserva ${reservation.id})`)
    await markConflict(db, reservation, payment, conflictReason)
    await notifyBusiness(businessAlertEmail({
      title: conflictReason === 'currency_mismatch' ? 'Pago en otra moneda' : 'Pago con monto distinto a la seña',
      intro: 'El pago se acreditó pero <strong>no coincide</strong> con la seña de la reserva. La reserva quedó en <strong>payment_conflict</strong> y NO bloquea la fecha: revisar en Mercado Pago y resolver a mano (devolver o confirmar).',
      r: reservation,
      extraRows: [
        { label: 'Monto acreditado', value: `${escapeHtml(String(payment.currency_id || '?'))} ${escapeHtml(formatARS(amount))}` },
        { label: 'Pago MP', value: escapeHtml(paymentId) },
      ],
    }))
    return reply(res, 200)
  }

  // Re-chequeo de disponibilidad contra la base (sin holds ni calendario: la base es el árbitro)
  const check = await assertSlotAvailable({
    startDate: reservation.start_date,
    endDate: reservation.end_date || reservation.start_date,
    slotType: reservation.slot_type,
    excludeReservationId: reservation.id,
    includeHolds: false,
    includeCalendar: false,
  })

  let claimed = null
  if (check.available) {
    const { data, error } = await writeTolerant(
      row => db.from('reservations').update(row).eq('id', reservation.id).eq('status', 'pending_payment').select('*'),
      {
        status: 'deposit_paid',
        mp_payment_id: paymentId,
        mp_transaction_amount: amount,
        deposit_paid_at: new Date().toISOString(),
      },
      'claim deposit_paid',
    )
    if (error) {
      if (error.code === '23P01') {
        console.error(`[payment-webhook] exclusion constraint: la fecha de ${reservation.id} ya está tomada por otra reserva paga`)
      } else if (error.code === '23505') {
        console.warn(`[payment-webhook] pago ${paymentId} ya asociado a otra reserva (duplicado)`)
        return reply(res, 200)
      } else {
        throw error
      }
    } else {
      claimed = data && data[0] ? data[0] : null
    }
    if (!error && !claimed) return reply(res, 200) // otra invocación ya la procesó
  }

  if (!claimed) {
    // Conflicto de fecha (re-chequeo o exclusion constraint): el cliente pagó una fecha tomada.
    const conflictRes = await markConflict(db, reservation, payment, 'conflict')
    if (conflictRes.duplicate) return reply(res, 200)
    const conflictRow = { ...reservation, status: 'payment_conflict', mp_payment_id: paymentId }
    await Promise.allSettled([
      notifyBusiness(businessAlertEmail({
        title: 'Pago recibido para una fecha ya ocupada',
        intro: 'La seña se acreditó pero otra reserva paga ya ocupa esa fecha/franja. La reserva quedó en <strong>payment_conflict</strong>: hay que <strong>devolver la seña</strong> desde Mercado Pago o proponerle otra fecha al cliente.',
        r: conflictRow,
        extraRows: [
          { label: 'Monto acreditado', value: escapeHtml(formatARS(amount)) },
          { label: 'Pago MP', value: escapeHtml(paymentId) },
        ],
      })),
      sendMail({ to: reservation.email, ...clientConflictEmail(conflictRow) }),
    ])
    return reply(res, 200)
  }

  // Reserva confirmada: calendario + notificaciones (fuera del camino crítico si hay waitUntil)
  await runAfterResponse(async () => {
    let calendarNote = ''
    const cal = await createReservationEvent(claimed)
    if (cal.ok) {
      const { error: calErr } = await db.from('reservations').update({ calendar_event_id: cal.eventId }).eq('id', claimed.id)
      if (calErr) logError('payment-webhook:save-calendar-id', calErr, { reservationId: claimed.id })
      claimed.calendar_event_id = cal.eventId
    } else {
      calendarNote = '⚠️ <strong>No se pudo bloquear en Google Calendar.</strong> Bloqueá la fecha a mano en el calendario para evitar una doble reserva presencial.'
      const { error: syncErr } = await writeTolerant(
        row => db.from('reservations').update(row).eq('id', claimed.id),
        { calendar_sync_error: String(cal.error || 'error desconocido').slice(0, 500) },
        'calendar_sync_error',
      )
      if (syncErr) logError('payment-webhook:save-calendar-error', syncErr, { reservationId: claimed.id })
    }

    const client = clientConfirmationEmail(claimed)
    const business = businessConfirmationEmail(claimed, { paymentId, calendarNote })
    const results = await Promise.allSettled([
      sendMail({ to: claimed.email, subject: client.subject, html: client.html }),
      notifyBusiness(business),
      sendCallMeBot(claimed),
    ])
    results.forEach((r, i) => {
      if (r.status === 'rejected') logError('payment-webhook:notify', r.reason, { step: i })
    })
    console.log(`[payment-webhook] reserva ${claimed.id} confirmada (pago ${paymentId}, calendario ${cal.ok ? 'ok' : 'FALLÓ'})`)
  })

  return reply(res, 200)
}

// ---------------------------------------------------------------------------
// Reembolso / contracargo / cancelación de un pago ya acreditado
// ---------------------------------------------------------------------------
async function handleRefund({ db, reservation, payment, res }) {
  const paymentId = String(payment.id)
  if (!ACTIVE.includes(reservation.status) || String(reservation.mp_payment_id || '') !== paymentId) {
    // Pago cancelado/reembolsado que no corresponde a una reserva paga (p. ej. intento
    // abandonado sobre una pendiente): no hay nada que liberar.
    return reply(res, 200)
  }

  const { data, error } = await setStatusTolerant(db, reservation.id, ACTIVE, {
    status: 'refunded',
    cancel_reason: payment.status,
  }, `refund:${payment.status}`)
  if (error) throw error
  if (!data || !data.length) return reply(res, 200) // ya procesado por otra invocación

  await runAfterResponse(async () => {
    let calendarNote = 'La fecha quedó liberada en el sitio.'
    if (reservation.calendar_event_id) {
      const del = await deleteCalendarEvent(reservation.calendar_event_id)
      if (del.ok) {
        const { error: clrErr } = await db.from('reservations').update({ calendar_event_id: null }).eq('id', reservation.id)
        if (clrErr) logError('payment-webhook:clear-calendar-id', clrErr, { reservationId: reservation.id })
        calendarNote += ' El evento de Google Calendar fue eliminado.'
      } else {
        calendarNote += ' ⚠️ <strong>No se pudo borrar el evento de Google Calendar</strong>: borralo a mano.'
        const { error: syncErr } = await writeTolerant(
          row => db.from('reservations').update(row).eq('id', reservation.id),
          { calendar_sync_error: String(del.error || 'error al borrar').slice(0, 500) },
          'calendar_sync_error',
        )
        if (syncErr) logError('payment-webhook:save-calendar-error', syncErr, { reservationId: reservation.id })
      }
    }
    const kind = { refunded: 'Reembolso', charged_back: 'Contracargo', cancelled: 'Pago cancelado' }[payment.status] || 'Reembolso'
    await notifyBusiness(businessAlertEmail({
      title: `${kind} de una seña`,
      intro: `Mercado Pago informó <strong>${escapeHtml(payment.status)}</strong> sobre el pago de esta reserva. La reserva pasó a <strong>refunded</strong>.`,
      r: reservation,
      extraRows: [
        { label: 'Monto reembolsado', value: escapeHtml(formatARS(payment.transaction_amount_refunded ?? payment.transaction_amount)) },
        { label: 'Pago MP', value: escapeHtml(paymentId) },
      ],
      footer: calendarNote,
    }))
    console.log(`[payment-webhook] reserva ${reservation.id} → refunded (${payment.status}, pago ${paymentId})`)
  })

  return reply(res, 200)
}

/** Reembolso parcial: el pago sigue 'approved' pero con monto devuelto. Sólo se avisa. */
async function handlePartialRefund({ reservation, payment, res }) {
  await notifyBusiness(businessAlertEmail({
    title: 'Reembolso parcial de una seña',
    intro: 'Mercado Pago informa un reembolso parcial sobre el pago de esta reserva. La reserva sigue activa; revisá si corresponde ajustar el saldo.',
    r: reservation,
    extraRows: [
      { label: 'Monto reembolsado', value: escapeHtml(formatARS(payment.transaction_amount_refunded)) },
      { label: 'Pago MP', value: escapeHtml(String(payment.id)) },
    ],
  }))
  return reply(res, 200)
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return reply(res, 200) // MP hace GET para verificar la URL

  const body = parseBody(req)
  const query = req.query || {}
  const type = String(body.type || query.type || query.topic || (typeof body.action === 'string' ? body.action.split('.')[0] : '') || '')
  if (type !== 'payment') return reply(res, 200)

  const rawId = query['data.id'] ?? body?.data?.id ?? query.id
  const dataId = rawId === undefined || rawId === null ? '' : String(rawId).trim()
  if (!DATA_ID_RE.test(dataId)) {
    console.warn('[payment-webhook] data.id inválido, notificación ignorada')
    return reply(res, 200)
  }

  const sig = verifySignature(req, dataId)
  if (!sig.ok) {
    console.error(`[payment-webhook] firma inválida (${sig.reason}) data.id=${dataId}`)
    return reply(res, 401)
  }

  // 1. Pago en Mercado Pago (fuente de verdad)
  let payment
  try {
    payment = await fetchPayment(dataId)
  } catch (err) {
    if (err && err.status === 404) {
      console.warn(`[payment-webhook] pago ${dataId} no existe en MP`)
      return reply(res, 200)
    }
    logError('payment-webhook:mp-get', err, { dataId })
    return reply(res, 500) // transitorio: que MP reintente
  }
  if (!payment || payment.id === undefined || payment.id === null) return reply(res, 200)

  const reservationId = typeof payment.external_reference === 'string' ? payment.external_reference.trim() : ''
  if (!isUuid(reservationId)) {
    console.warn(`[payment-webhook] pago ${dataId} sin external_reference válido`)
    return reply(res, 200)
  }

  // 2. Reserva
  let db
  try {
    db = supabaseAdmin()
  } catch (err) {
    logError('payment-webhook:config', err)
    return reply(res, 500)
  }
  const { data: reservation, error: fetchErr } = await db
    .from('reservations')
    .select('*')
    .eq('id', reservationId)
    .maybeSingle()
  if (fetchErr) {
    logError('payment-webhook:db-fetch', fetchErr, { reservationId })
    return reply(res, 500)
  }
  if (!reservation) {
    console.warn(`[payment-webhook] reserva ${reservationId} no existe (pago ${dataId})`)
    return reply(res, 200)
  }

  try {
    const status = String(payment.status || '')
    if (status === 'approved') {
      const refunded = Number(payment.transaction_amount_refunded) || 0
      if (refunded > 0 && ACTIVE.includes(reservation.status) && String(reservation.mp_payment_id || '') === String(payment.id)) {
        return await handlePartialRefund({ reservation, payment, res })
      }
      return await handleApproved({ db, reservation, payment, res })
    }
    if (status === 'refunded' || status === 'charged_back' || status === 'cancelled') {
      return await handleRefund({ db, reservation, payment, res })
    }
    // pending / in_process / rejected / etc.: no cambia nada en la reserva
    return reply(res, 200)
  } catch (err) {
    logError('payment-webhook', err, { reservationId, dataId })
    return reply(res, 500)
  }
}
