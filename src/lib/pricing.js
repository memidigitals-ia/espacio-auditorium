// ==========================================
// REGLAS DE NEGOCIO — Precios y cálculos
// ==========================================

export const PRICES = {
  HALF_DAY: 520000,        // Media jornada 4hs sin IVA
  FULL_DAY: 780000,        // Jornada completa 8hs sin IVA
  EXTRA_HOUR: 130000,      // Hora adicional sin IVA
  IVA_RATE: 0.21,          // 21% IVA
  DISCOUNT_MULTI_DAY: 0.15, // 15% descuento para 4+ días
  MULTI_DAY_THRESHOLD: 4,  // Días mínimos para descuento
  DEPOSIT_RATE: 0.30,      // 30% seña
}

export const DURATION_LABELS = {
  half_day: 'Media jornada (4 hs)',
  full_day: 'Jornada completa (8 hs)',
}

export const TIME_SLOTS = {
  half_day_morning: { label: 'Mañana (8:00–13:00)', start: '08:00', end: '13:00' },
  half_day_afternoon: { label: 'Tarde/Noche (14:00–22:00)', start: '14:00', end: '22:00' },
  full_day: { label: 'Día completo (8:00–22:00)', start: '08:00', end: '22:00' },
}

/**
 * Calcula el precio total de una reserva
 * @param {object} params
 * @param {'half_day'|'full_day'} params.durationType
 * @param {number} params.days - Cantidad de días
 * @param {number} params.additionalHours - Horas adicionales
 * @returns {object} Desglose de precios
 */
export function calculatePrice({ durationType, days = 1, additionalHours = 0 }) {
  const basePerDay = durationType === 'half_day' ? PRICES.HALF_DAY : PRICES.FULL_DAY
  const extraHoursTotal = additionalHours * PRICES.EXTRA_HOUR

  const subtotalBeforeDiscount = (basePerDay * days) + extraHoursTotal

  const discount = days >= PRICES.MULTI_DAY_THRESHOLD
    ? subtotalBeforeDiscount * PRICES.DISCOUNT_MULTI_DAY
    : 0

  const subtotalAfterDiscount = subtotalBeforeDiscount - discount
  const iva = subtotalAfterDiscount * PRICES.IVA_RATE
  const total = subtotalAfterDiscount + iva
  const deposit = total * PRICES.DEPOSIT_RATE
  const balance = total - deposit

  return {
    basePerDay,
    days,
    additionalHours,
    extraHoursTotal,
    subtotalBeforeDiscount,
    discount,
    discountPercentage: days >= PRICES.MULTI_DAY_THRESHOLD ? PRICES.DISCOUNT_MULTI_DAY * 100 : 0,
    subtotalAfterDiscount,
    iva,
    total,
    deposit,
    balance,
  }
}

export function formatARS(amount) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function getDaysCount(from, to) {
  if (!from || !to) return 1
  const diff = Math.abs(new Date(to) - new Date(from))
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
}
