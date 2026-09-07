/**
 * POST /api/create-payment
 *
 * Crea (o reutiliza) una reserva pendiente y genera la preferencia de pago de
 * Mercado Pago para la seña. TODO se valida y se calcula en el servidor:
 * nunca se confía en precios, días ni cupones que mande el navegador.
 *
 * Flujo (ver CONTRACTS §2):
 *   parseBody → validateBookingInput → verifyTurnstile → rate limit (IP 10/h,
 *   email 5/día) → disponibilidad (falla cerrado si Google Calendar no responde)
 *   → reutilizar pending propio (<2 h) → precio server-side + cupón sobre la seña
 *   → insert/update → preferencia MP → guardar mp_preference_id → responder.
 *
 * Respuestas: 200 {reservationId, preferenceId, initPoint, depositAmount, couponDiscountPct}
 *             400 {error, field} · 409 {error} · 429 {error, retryAfter} · 503 {error}
 */
import { MercadoPagoConfig, Preference } from 'mercadopago'
import {
  handleOptions, json, error, safeError, parseBody, supabaseAdmin, getClientIp,
  checkRateLimit, hashKey, randomToken, logError, requireEnv, APP_URL,
} from './_utils.js'
import { validateBookingInput, resolveCoupon, verifyTurnstile } from './_validate.js'
import { assertSlotAvailable, HOLD_MINUTES } from './_availability.js'
import { formatDateES } from './_email.js'
import { calculatePrice, getDaysCount } from '../src/lib/pricing.js'

const RATE_IP_MAX = 10          // intentos por IP por hora
const RATE_EMAIL_MAX = 5        // intentos por email por día
const PREFERENCE_TTL_MS = HOLD_MINUTES * 60 * 1000
const STATEMENT_DESCRIPTOR = 'ESPACIO AUDITORIUM'

/** Columnas que existen recién con la migración de Fase B. */
const PHASE_B_COLUMNS = ['coupon_code', 'coupon_discount_pct', 'public_token', 'client_ip', 'cancel_reason']

/** PostgREST devuelve 42703 (columna inexistente) o PGRST204 (no está en el schema cache). */
function isMissingColumnError(err) {
  return err && (err.code === '42703' || err.code === 'PGRST204')
}

function stripPhaseB(row) {
  const out = { ...row }
  for (const c of PHASE_B_COLUMNS) delete out[c]
  return out
}

/**
 * Ejecuta una escritura y, si la base todavía está en Fase A (faltan columnas),
 * reintenta sin las columnas nuevas. `run(row)` devuelve la promesa de Supabase.
 */
async function writeTolerant(run, row, context) {
  let result = await run(row)
  if (result.error && isMissingColumnError(result.error)) {
    console.warn(`[create-payment] ${context}: columnas de Fase B ausentes, reintentando sin ellas (${result.error.message})`)
    result = await run(stripPhaseB(row))
  }
  return result
}

const SLOT_SHORT = { morning: 'mañana', afternoon: 'tarde' }

/** Resume los conflictos en una frase en español, sin revelar la fuente. */
function conflictMessage(conflicts) {
  const byDate = new Map()
  for (const c of conflicts) {
    const cur = byDate.get(c.date) || new Set()
    cur.add(SLOT_SHORT[c.slot] || c.slot)
    byDate.set(c.date, cur)
  }
  const parts = [...byDate.entries()].slice(0, 4).map(([date, slots]) => {
    const s = [...slots]
    const label = s.length === 2 ? 'todo el día' : s[0]
    return `${formatDateES(date)} (${label})`
  })
  const more = byDate.size > 4 ? ` y ${byDate.size - 4} fecha(s) más` : ''
  return `La fecha ya no está disponible: ${parts.join(', ')}${more}. Por favor elegí otra.`
}

function describeBooking(v) {
  const jornada = v.durationType === 'half_day' ? 'Media jornada' : 'Jornada completa'
  const rango = v.endDate !== v.startDate ? `${v.startDate} → ${v.endDate}` : v.startDate
  return `${jornada} · ${rango} · ${v.eventType}`.slice(0, 250)
}

/** Crea la preferencia de Mercado Pago para una reserva ya persistida. */
async function createPreference({ reservation, v, depositAmount, publicToken }) {
  const { MP_ACCESS_TOKEN } = requireEnv(['MP_ACCESS_TOKEN'])
  const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN, options: { timeout: 10000 } })
  const preference = new Preference(mp)
  const now = Date.now()
  const qs = `reservation_id=${encodeURIComponent(reservation.id)}&t=${encodeURIComponent(publicToken)}`

  return preference.create({
    body: {
      items: [{
        id: reservation.id,
        title: 'Seña - Espacio Auditorium',
        description: describeBooking(v),
        category_id: 'services',
        quantity: 1,
        unit_price: depositAmount,
        currency_id: 'ARS',
      }],
      payer: { name: v.firstName, surname: v.lastName, email: v.email },
      back_urls: {
        success: `${APP_URL}/pago?status=approved&${qs}`,
        pending: `${APP_URL}/pago?status=pending&${qs}`,
        failure: `${APP_URL}/pago?status=failure&${qs}`,
      },
      auto_return: 'approved',
      notification_url: `${APP_URL}/api/payment-webhook`,
      external_reference: reservation.id,
      statement_descriptor: STATEMENT_DESCRIPTOR,
      metadata: { reservation_id: reservation.id },
      expires: true,
      expiration_date_from: new Date(now).toISOString(),
      expiration_date_to: new Date(now + PREFERENCE_TTL_MS).toISOString(),
    },
  })
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405)

  // 1. Validación de entrada
  const body = parseBody(req)
  const validation = validateBookingInput(body)
  if (!validation.ok) {
    return json(res, { error: validation.error, field: validation.field }, 400)
  }
  const v = validation.value
  const ip = getClientIp(req)

  // 2. Turnstile (opcional: sólo si TURNSTILE_SECRET_KEY está configurada)
  const turnstile = await verifyTurnstile(v.turnstileToken, ip)
  if (!turnstile.ok) {
    console.warn(`[create-payment] Turnstile rechazado (${turnstile.reason || 'sin motivo'}) ip=${ip}`)
    return json(res, { error: 'No pudimos verificar que sos una persona. Recargá la página e intentá de nuevo.', field: 'turnstileToken' }, 400)
  }

  // 3. Rate limiting por IP y por email (hasheado)
  const [ipLimit, emailLimit] = await Promise.all([
    checkRateLimit({ bucket: 'create-payment:ip', key: ip, max: RATE_IP_MAX, windowSeconds: 3600 }),
    checkRateLimit({ bucket: 'create-payment:email', key: hashKey(v.email), max: RATE_EMAIL_MAX, windowSeconds: 86400 }),
  ])
  const limited = !ipLimit.allowed ? ipLimit : !emailLimit.allowed ? emailLimit : null
  if (limited) {
    console.warn(`[create-payment] rate limit ip=${ip} email=${hashKey(v.email).slice(0, 8)}`)
    res.setHeader('Retry-After', String(limited.retryAfterSeconds))
    return json(res, {
      error: 'Hiciste demasiados intentos de reserva. Esperá un rato o escribinos por WhatsApp y te ayudamos.',
      retryAfter: limited.retryAfterSeconds,
    }, 429)
  }

  let db
  try {
    db = supabaseAdmin()
  } catch (err) {
    return safeError(res, 'create-payment:config', err)
  }

  // 4. Precio real, calculado 100% en el servidor con las reglas vigentes.
  const days = getDaysCount(v.startDate, v.endDate)
  const pricing = calculatePrice({ durationType: v.durationType, days, additionalHours: v.additionalHours })

  // Cupón: se aplica SOLO sobre la seña; el saldo absorbe la diferencia.
  const coupon = resolveCoupon(v.coupon)
  if (v.coupon && !coupon.code) {
    return json(res, { error: 'El cupón ingresado no es válido.', field: 'coupon' }, 400)
  }
  const depositAmount = Math.round(pricing.deposit * (1 - coupon.pct / 100))
  const totalAmount = Math.round(pricing.total)
  const balanceAmount = Math.round(pricing.total - depositAmount)
  if (depositAmount < 1) {
    console.error(`[create-payment] el cupón ${coupon.code} deja la seña en $${depositAmount}; no se puede cobrar por Mercado Pago`)
    return json(res, { error: 'Ese cupón no puede usarse en reservas online. Escribinos por WhatsApp y lo resolvemos.', field: 'coupon' }, 400)
  }

  try {
    // 5. ¿Ya tiene el mismo cliente una reserva pendiente idéntica dentro del hold?
    const holdSince = new Date(Date.now() - PREFERENCE_TTL_MS).toISOString()
    const { data: ownPending, error: ownErr } = await db
      .from('reservations')
      .select('id, deposit_amount, mp_preference_id, created_at')
      .eq('email', v.email)
      .eq('start_date', v.startDate)
      .eq('end_date', v.endDate)
      .eq('slot_type', v.slotType)
      .eq('status', 'pending_payment')
      .gte('created_at', holdSince)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (ownErr) throw ownErr

    // 6. Disponibilidad (única fuente: _availability.js). Falla CERRADO si no
    //    podemos consultar Google Calendar: preferimos no vender a vender dos veces.
    let availability
    try {
      availability = await assertSlotAvailable({
        startDate: v.startDate,
        endDate: v.endDate,
        slotType: v.slotType,
        excludeReservationId: ownPending?.id || null,
      })
    } catch (err) {
      return safeError(res, 'create-payment:availability', err, 'No pudimos verificar disponibilidad. Intentá de nuevo en unos minutos.', 503)
    }
    if (!availability.calendarOk) {
      console.error('[create-payment] Google Calendar no disponible:', availability.calendarError)
      return json(res, { error: 'No pudimos verificar disponibilidad. Intentá de nuevo en unos minutos o escribinos por WhatsApp.' }, 503)
    }
    if (!availability.available) {
      return json(res, { error: conflictMessage(availability.conflicts) }, 409)
    }

    // 7. Fila de la reserva (nueva o la pendiente propia, actualizada)
    const publicToken = randomToken()
    const nowIso = new Date().toISOString()
    const fields = {
      first_name: v.firstName,
      last_name: v.lastName,
      email: v.email,
      whatsapp: v.whatsapp,
      event_type: v.eventType,
      notes: v.notes || '',
      start_date: v.startDate,
      end_date: v.endDate,
      duration_type: v.durationType,
      slot_type: v.slotType,
      additional_hours: v.additionalHours,
      days_count: days,
      base_price: pricing.basePerDay,
      discount_percentage: pricing.discountPercentage || 0,
      subtotal_price: Math.round(pricing.subtotalAfterDiscount),
      iva_amount: Math.round(pricing.iva),
      total_price: totalAmount,
      deposit_amount: depositAmount,
      balance_amount: balanceAmount,
      status: 'pending_payment',
      policy_accepted: true,
      policy_accepted_at: nowIso, // server-side: el cliente no puede retro-datarlo
      // Fase B (se toleran ausentes)
      coupon_code: coupon.code,
      coupon_discount_pct: coupon.pct,
      public_token: publicToken,
      client_ip: ip,
    }

    let reservation
    if (ownPending) {
      // Reutilizamos la fila: mismo cliente, mismas fechas y franja, hold vigente.
      // Se refrescan datos/precio (pudo cambiar horas extra o cupón) y se
      // regenera la preferencia. Evita filas duplicadas y emails repetidos.
      const { data, error: updErr } = await writeTolerant(
        row => db.from('reservations').update(row).eq('id', ownPending.id).eq('status', 'pending_payment').select('id').maybeSingle(),
        fields,
        'update pending',
      )
      if (updErr) throw updErr
      reservation = data
      console.log(`[create-payment] reutilizando pendiente ${ownPending.id}`)
    }
    if (!reservation) {
      const { data, error: insErr } = await writeTolerant(
        row => db.from('reservations').insert(row).select('id').single(),
        fields,
        'insert',
      )
      if (insErr) throw insErr
      reservation = data
    }

    // 8. Preferencia de Mercado Pago
    let preferenceData
    try {
      preferenceData = await createPreference({ reservation, v, depositAmount, publicToken })
    } catch (err) {
      // Sin preferencia no hay cobro posible: liberamos el hold para no bloquear la fecha 2 h.
      const { error: cancelErr } = await writeTolerant(
        row => db.from('reservations').update(row).eq('id', reservation.id).eq('status', 'pending_payment'),
        { status: 'cancelled', cancel_reason: 'preference_error' },
        'cancel tras error MP',
      )
      if (cancelErr) logError('create-payment:cancel-after-mp-error', cancelErr, { reservationId: reservation.id })
      return safeError(res, 'create-payment:mp-preference', err, 'No pudimos iniciar el pago con Mercado Pago. Intentá de nuevo en unos minutos.', 502)
    }
    if (!preferenceData?.id || !preferenceData?.init_point) {
      return safeError(res, 'create-payment:mp-preference', new Error('respuesta de MP sin id/init_point'), 'No pudimos iniciar el pago con Mercado Pago. Intentá de nuevo en unos minutos.', 502)
    }

    // 9. Guardar el id de la preferencia (no bloqueante para el cliente)
    const { error: prefErr } = await db
      .from('reservations')
      .update({ mp_preference_id: preferenceData.id })
      .eq('id', reservation.id)
    if (prefErr) logError('create-payment:save-preference', prefErr, { reservationId: reservation.id })

    return json(res, {
      reservationId: reservation.id,
      preferenceId: preferenceData.id,
      initPoint: preferenceData.init_point,
      depositAmount,
      couponDiscountPct: coupon.pct,
    })
  } catch (err) {
    // Exclusion constraint (Fase B) u otra falla de base: mensaje genérico, detalle en logs.
    if (err && err.code === '23P01') {
      return json(res, { error: 'La fecha ya no está disponible. Por favor elegí otra.' }, 409)
    }
    return safeError(res, 'create-payment', err)
  }
}
