/**
 * Validación y normalización de entrada del usuario (server-side).
 * Nunca confiar en el cliente: todo lo que llega por POST pasa por acá.
 */
import { todayLocal, addDaysIso, addMonthsIso, daysBetweenInclusive } from './_dates.js'

export const EVENT_TYPES = [
  'Conferencia / Charla',
  'Capacitación / Taller',
  'Presentación corporativa',
  'Evento social / Celebración',
  'Show / Espectáculo',
  'Filmación / Producción',
  'Otro',
]
export const DURATION_TYPES = ['half_day', 'full_day']
export const SLOT_TYPES = ['half_day_morning', 'half_day_afternoon', 'full_day']

export const LIMITS = {
  maxAdditionalHours: 6,
  maxDays: 30,
  maxMonthsAhead: 18,
  minDaysAhead: 1, // se reserva desde mañana
  name: 80,
  email: 254,
  whatsapp: 30,
  eventType: 80,
  notes: 1000,
  coupon: 32,
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const EMAIL_RE = /^[^\s@,;<>()[\]\\"]+@[^\s@,;<>()[\]\\"]+\.[A-Za-z]{2,}$/
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]{0,79}$/u

export function isIsoDate(s) {
  if (typeof s !== 'string' || !ISO_DATE_RE.test(s)) return false
  const [y, m, d] = s.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}

export function isUuid(s) {
  return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)
}

/** Quita caracteres de control, colapsa espacios, recorta. */
export function cleanText(s, max) {
  if (s === null || s === undefined) return ''
  // eslint-disable-next-line no-control-regex
  let t = String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  t = t.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim()
  return max ? t.slice(0, max) : t
}

export function isEmail(s) {
  return typeof s === 'string' && s.length <= LIMITS.email && EMAIL_RE.test(s)
}

/** Normaliza a dígitos con "+" opcional. Devuelve null si no parece un teléfono. */
export function normalizePhone(s) {
  if (typeof s !== 'string') return null
  const plus = s.trim().startsWith('+')
  const digits = s.replace(/\D/g, '')
  if (digits.length < 8 || digits.length > 15) return null
  return (plus ? '+' : '') + digits
}

/**
 * Valida el body de /api/create-payment.
 * @returns {{ok:true, value:object} | {ok:false, error:string, field:string}}
 */
export function validateBookingInput(body, { today = todayLocal() } = {}) {
  const b = body && typeof body === 'object' ? body : {}
  const fail = (field, error) => ({ ok: false, field, error })

  // Fechas
  const startDate = typeof b.startDate === 'string' ? b.startDate.trim() : ''
  const endDate = typeof b.endDate === 'string' && b.endDate.trim() ? b.endDate.trim() : startDate
  if (!isIsoDate(startDate)) return fail('startDate', 'Fecha de inicio inválida')
  if (!isIsoDate(endDate)) return fail('endDate', 'Fecha de fin inválida')
  if (endDate < startDate) return fail('endDate', 'La fecha de fin no puede ser anterior a la de inicio')
  const minStart = addDaysIso(today, LIMITS.minDaysAhead)
  if (startDate < minStart) return fail('startDate', 'Las reservas online se toman con al menos un día de anticipación')
  if (startDate > addMonthsIso(today, LIMITS.maxMonthsAhead)) return fail('startDate', `Sólo tomamos reservas hasta ${LIMITS.maxMonthsAhead} meses adelante`)
  const days = daysBetweenInclusive(startDate, endDate)
  if (days > LIMITS.maxDays) return fail('endDate', `El máximo online es ${LIMITS.maxDays} días; para más, escribinos`)

  // Jornada / franja
  const durationType = b.durationType
  if (!DURATION_TYPES.includes(durationType)) return fail('durationType', 'Tipo de jornada inválido')
  let slotType = b.slotType
  if (durationType === 'full_day') slotType = 'full_day'
  else if (!['half_day_morning', 'half_day_afternoon'].includes(slotType)) return fail('slotType', 'Elegí turno mañana o tarde')

  const hoursNum = Number(b.additionalHours ?? 0)
  if (!Number.isInteger(hoursNum) || hoursNum < 0 || hoursNum > LIMITS.maxAdditionalHours) {
    return fail('additionalHours', `Las horas adicionales van de 0 a ${LIMITS.maxAdditionalHours}`)
  }

  // Datos de contacto
  const firstName = cleanText(b.firstName, LIMITS.name)
  const lastName = cleanText(b.lastName, LIMITS.name)
  if (!NAME_RE.test(firstName)) return fail('firstName', 'Ingresá un nombre válido')
  if (!NAME_RE.test(lastName)) return fail('lastName', 'Ingresá un apellido válido')
  const email = cleanText(b.email, LIMITS.email).toLowerCase()
  if (!isEmail(email)) return fail('email', 'Ingresá un email válido')
  const whatsapp = normalizePhone(typeof b.whatsapp === 'string' ? b.whatsapp : '')
  if (!whatsapp) return fail('whatsapp', 'Ingresá un número de WhatsApp válido')
  const eventType = cleanText(b.eventType, LIMITS.eventType)
  if (!EVENT_TYPES.includes(eventType)) return fail('eventType', 'Seleccioná un tipo de evento')
  const notes = cleanText(b.notes, LIMITS.notes)
  if (b.policyAccepted !== true && b.policyAccepted !== 'true') return fail('policyAccepted', 'Debés aceptar la política de cancelación')

  const couponRaw = typeof b.coupon === 'string' ? b.coupon.trim().toUpperCase() : ''
  const coupon = /^[A-Z0-9_-]{0,32}$/.test(couponRaw) ? couponRaw : ''

  return {
    ok: true,
    value: {
      startDate, endDate, days, durationType, slotType,
      additionalHours: hoursNum,
      firstName, lastName, email, whatsapp, eventType, notes,
      coupon,
      turnstileToken: typeof b.turnstileToken === 'string' ? b.turnstileToken.slice(0, 2048) : '',
    },
  }
}

/**
 * Cupones desde COUPON_CODES (JSON {"CODIGO": porcentaje}). Seguro ante claves raras.
 * @returns {{code:string|null, pct:number}}
 */
export function resolveCoupon(code) {
  if (!code) return { code: null, pct: 0 }
  let coupons = {}
  try {
    coupons = JSON.parse(process.env.COUPON_CODES || '{}')
  } catch (err) {
    console.error('[coupons] COUPON_CODES no es JSON válido:', err.message)
    return { code: null, pct: 0 }
  }
  if (!coupons || typeof coupons !== 'object' || !Object.hasOwn(coupons, code)) return { code: null, pct: 0 }
  const pct = Number(coupons[code])
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return { code: null, pct: 0 }
  return { code, pct }
}

/**
 * Verifica un token de Cloudflare Turnstile. Si TURNSTILE_SECRET_KEY no está
 * configurada, no exige token (feature opcional).
 */
export async function verifyTurnstile(token, ip) {
  const secret = (process.env.TURNSTILE_SECRET_KEY || '').trim()
  if (!secret) return { ok: true, skipped: true }
  if (!token) return { ok: false, reason: 'missing-token' }
  try {
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    })
    const data = await resp.json()
    return data.success ? { ok: true } : { ok: false, reason: (data['error-codes'] || []).join(',') }
  } catch (err) {
    console.error('[turnstile] verificación falló:', err.message)
    return { ok: false, reason: 'verify-error' }
  }
}
