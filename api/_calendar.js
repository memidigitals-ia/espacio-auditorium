/**
 * Google Calendar: lectura de bloqueos y alta/baja de eventos de reserva.
 *
 * Reglas de clasificación (todas en hora de Buenos Aires, NO en UTC):
 *   - Franja mañana  = 08:00–13:00, franja tarde = 14:00–22:00.
 *   - Un evento bloquea una franja si se solapa con ella (aunque sea 1 hora).
 *   - Eventos de día completo bloquean ambas franjas de cada día.
 *   - Eventos cancelados, "transparentes" (disponible) o creados por este
 *     sistema (ya están en la base) se ignoran.
 */
import { getCalendarClient, CALENDAR_ID, hasGoogleCredentials } from './_google.js'
import { logError } from './_utils.js'
import { TZ, addDaysIso, eachDateIso } from './_dates.js'

export { addDaysIso, eachDateIso }

export const SYSTEM_SOURCE = 'espacio-web'

/** Horarios reales de cada franja (minutos desde 00:00, hora local). */
export const SLOT_WINDOWS = {
  half_day_morning: { start: 8 * 60, end: 13 * 60 },
  half_day_afternoon: { start: 14 * 60, end: 22 * 60 },
}

/** Horarios con 1 h de margen con los que se crean los eventos de reserva. */
export const RESERVATION_EVENT_TIMES = {
  full_day: { start: '07:00', end: '23:00' },
  half_day_morning: { start: '07:00', end: '14:00' },
  half_day_afternoon: { start: '13:00', end: '23:00' },
}

const _fmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ, hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
})

/** ISO datetime (con offset o Z) → { date: 'YYYY-MM-DD', minutes } en hora de Buenos Aires. */
export function toLocalParts(iso) {
  const parts = Object.fromEntries(_fmt.formatToParts(new Date(iso)).map(p => [p.type, p.value]))
  const hour = Number(parts.hour) % 24 // algunos runtimes devuelven "24" para medianoche
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: hour * 60 + Number(parts.minute) }
}

export function isSystemEvent(event) {
  if (!event) return false
  if (event.extendedProperties?.private?.source === SYSTEM_SOURCE) return true
  const summary = event.summary || ''
  const description = event.description || ''
  return summary.includes('🔒 RESERVADO') || summary.includes('[RESERVA]') ||
    /Reserva ID:/.test(description) || description.includes('Reserva #')
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

/**
 * Clasifica un evento en bloqueos por día.
 * @returns {null | Array<{date:string, morning:boolean, afternoon:boolean}>}
 */
export function classifyEvent(event) {
  if (!event || event.status === 'cancelled') return null
  if (event.transparency === 'transparent') return null // "Disponible" en Google
  if (isSystemEvent(event)) return null

  // Día completo (o varios): end.date es exclusivo
  if (event.start?.date) {
    const endExclusive = event.end?.date || addDaysIso(event.start.date, 1)
    const lastDay = addDaysIso(endExclusive, -1)
    if (lastDay < event.start.date) return null
    return eachDateIso(event.start.date, lastDay).map(date => ({ date, morning: true, afternoon: true }))
  }

  if (!event.start?.dateTime || !event.end?.dateTime) return null
  const s = toLocalParts(event.start.dateTime)
  const e = toLocalParts(event.end.dateTime)
  if (e.date < s.date) return null

  return eachDateIso(s.date, e.date).map(date => {
    const dayStart = date === s.date ? s.minutes : 0
    let dayEnd = date === e.date ? e.minutes : 24 * 60
    if (date === e.date && e.minutes === 0 && date !== s.date) return null // termina 00:00 → no ocupa ese día
    if (dayEnd <= dayStart) dayEnd = dayStart + 1
    const morning = overlaps(dayStart, dayEnd, SLOT_WINDOWS.half_day_morning.start, SLOT_WINDOWS.half_day_morning.end)
    const afternoon = overlaps(dayStart, dayEnd, SLOT_WINDOWS.half_day_afternoon.start, SLOT_WINDOWS.half_day_afternoon.end)
    if (!morning && !afternoon) return null
    return { date, morning, afternoon }
  }).filter(Boolean)
}

/**
 * Lista los bloqueos de Google Calendar entre dos fechas (inclusive).
 * Lanza error si no hay credenciales o la API falla: el llamador decide si
 * "falla cerrado" (no vender) o sigue sin calendario.
 * @returns {Promise<Array<{date, morning, afternoon}>>}
 */
export async function listCalendarBlocks({ from, to }) {
  if (!hasGoogleCredentials()) throw new Error('Google Calendar no configurado')
  const calendar = getCalendarClient('read')
  const timeMin = new Date(`${from}T00:00:00-03:00`).toISOString()
  const timeMax = new Date(`${addDaysIso(to, 1)}T00:00:00-03:00`).toISOString()

  const blocks = []
  let pageToken
  let pages = 0
  do {
    const resp = await calendar.events.list({
      calendarId: CALENDAR_ID,
      timeMin, timeMax,
      singleEvents: true,
      showDeleted: false,
      maxResults: 2500,
      pageToken,
    }, { timeout: 8000 })
    for (const ev of resp.data.items || []) {
      const c = classifyEvent(ev)
      if (c) blocks.push(...c)
    }
    pageToken = resp.data.nextPageToken
  } while (pageToken && ++pages < 10)
  return blocks
}

/**
 * Crea el evento de una reserva confirmada.
 * @returns {Promise<{ok:true, eventId:string} | {ok:false, error:string}>}
 */
export async function createReservationEvent(reservation) {
  try {
    const calendar = getCalendarClient('write')
    const times = RESERVATION_EVENT_TIMES[reservation.slot_type] || RESERVATION_EVENT_TIMES.full_day
    const slotLabel = {
      full_day: 'jornada completa',
      half_day_morning: 'media jornada mañana',
      half_day_afternoon: 'media jornada tarde',
    }[reservation.slot_type] || 'jornada completa'

    const event = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `🔒 RESERVADO · ${reservation.first_name} ${reservation.last_name} · ${slotLabel}`,
        description: [
          `Reserva ID: ${reservation.id}`,
          `Cliente: ${reservation.first_name} ${reservation.last_name}`,
          `Email: ${reservation.email}`,
          `WhatsApp: ${reservation.whatsapp}`,
          `Tipo de evento: ${reservation.event_type}`,
          `Franja: ${slotLabel}`,
          reservation.additional_hours ? `Horas adicionales: ${reservation.additional_hours}` : '',
          `Seña abonada: $${Number(reservation.deposit_amount || 0).toLocaleString('es-AR')}`,
          `Total: $${Number(reservation.total_price || 0).toLocaleString('es-AR')}`,
          reservation.notes ? `\nNotas: ${reservation.notes}` : '',
        ].filter(Boolean).join('\n'),
        start: { dateTime: `${reservation.start_date}T${times.start}:00`, timeZone: TZ },
        end: { dateTime: `${reservation.end_date || reservation.start_date}T${times.end}:00`, timeZone: TZ },
        colorId: '11',
        extendedProperties: { private: { source: SYSTEM_SOURCE, reservationId: String(reservation.id) } },
      },
    }, { timeout: 8000 })
    return { ok: true, eventId: event.data.id }
  } catch (err) {
    logError('calendar-create', err, { reservationId: reservation?.id })
    return { ok: false, error: err.message }
  }
}

/**
 * Borra un evento. 404/410 (ya no existe) cuenta como éxito.
 * @returns {Promise<{ok:boolean, alreadyGone?:boolean, error?:string}>}
 */
export async function deleteCalendarEvent(eventId) {
  if (!eventId) return { ok: true, alreadyGone: true }
  try {
    const calendar = getCalendarClient('write')
    await calendar.events.delete({ calendarId: CALENDAR_ID, eventId }, { timeout: 8000 })
    return { ok: true }
  } catch (err) {
    const code = err?.code || err?.response?.status
    if (code === 404 || code === 410) return { ok: true, alreadyGone: true }
    logError('calendar-delete', err, { eventId })
    return { ok: false, error: err.message }
  }
}
