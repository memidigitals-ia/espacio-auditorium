import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'
import { handleOptions, json, error } from './_utils.js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

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
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      eventId,
    })
    console.log('[admin-cancel] Calendar event deleted:', eventId)
  } catch (err) {
    console.error('[admin-cancel] Calendar delete error:', err.message)
  }
}

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405)

  const { id, password } = req.body
  if (!id) return error(res, 'Missing id', 400)

  const adminPassword = (process.env.ADMIN_PASSWORD || '').trim()
  if (!adminPassword || password !== adminPassword) return error(res, 'Unauthorized', 401)

  const { data: reservation, error: fetchErr } = await supabase
    .from('reservations')
    .select('id, status, calendar_event_id')
    .eq('id', id)
    .single()

  if (fetchErr || !reservation) return error(res, 'Reservation not found', 404)
  if (reservation.status === 'cancelled') return json(res, { ok: true, skipped: true })

  if (reservation.calendar_event_id) {
    await deleteCalendarEvent(reservation.calendar_event_id)
  }

  const { error: updateErr } = await supabase
    .from('reservations')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (updateErr) return error(res, updateErr.message, 500)

  return json(res, { ok: true })
}
