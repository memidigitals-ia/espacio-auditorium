import { google } from 'googleapis'
import { handleOptions, json, error } from './_utils.js'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'GET') return error(res, 'Method not allowed', 405)

  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    if (!serviceAccountJson) return json(res, { blocked: [] })

    const serviceAccount = JSON.parse(serviceAccountJson)
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
    })

    const calendar = google.calendar({ version: 'v3', auth })
    const calendarId = process.env.GOOGLE_CALENDAR_ID

    // Fetch events for the next 6 months
    const now = new Date()
    const sixMonthsLater = new Date()
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6)

    const response = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: sixMonthsLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 500,
    })

    const events = response.data.items || []
    const blocked = []

    for (const event of events) {
      // Skip events created by this system (reservations) to avoid double-blocking
      if (event.description?.includes('Reserva #') || event.summary?.includes('[RESERVA]')) continue

      const startDate = event.start.date || event.start.dateTime?.split('T')[0]
      const endDate = event.end.date || event.end.dateTime?.split('T')[0]
      if (!startDate) continue

      // For all-day events, Google Calendar end date is exclusive (next day), adjust it
      let adjustedEnd = endDate
      if (event.start.date && endDate > startDate) {
        // All-day multi-day: end is exclusive, subtract one day
        const d = new Date(endDate + 'T12:00:00')
        d.setDate(d.getDate() - 1)
        adjustedEnd = d.toISOString().split('T')[0]
      }

      // Determine slot_type from event times
      let slotType = 'full_day'
      if (event.start.dateTime) {
        const startHour = new Date(event.start.dateTime).getHours()
        const endHour = new Date(event.end.dateTime).getHours()
        if (startHour < 13 && endHour <= 13) slotType = 'half_day_morning'
        else if (startHour >= 13) slotType = 'half_day_afternoon'
        else slotType = 'full_day'
      }

      blocked.push({
        start_date: startDate,
        end_date: adjustedEnd || startDate,
        slot_type: slotType,
        source: 'google_calendar',
        summary: event.summary || '',
      })
    }

    return json(res, { blocked })
  } catch (err) {
    console.error('blocked-dates error:', err)
    // Return empty on error so booking page still works
    return json(res, { blocked: [], error: err.message })
  }
}
