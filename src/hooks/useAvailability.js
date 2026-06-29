import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { format, eachDayOfInterval } from 'date-fns'
import axios from 'axios'

// Parsea "YYYY-MM-DD" como fecha LOCAL (evita corrimiento por timezone UTC)
function localDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function useAvailability() {
  const [blockedDates, setBlockedDates] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const fetchBlockedDates = useCallback(async () => {
    try {
      // 1. Reservas confirmadas/pendientes en Supabase
      const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select('start_date, end_date, slot_type, status')
        .in('status', ['deposit_paid', 'confirmed'])

      if (resError) throw resError

      // 2. Eventos de Google Calendar (via API serverless)
      let calendarBlocked = []
      try {
        const { data } = await axios.get('/api/blocked-dates')
        calendarBlocked = data.blocked || []
      } catch {
        // Si falla Google Calendar, seguimos con Supabase solo
      }

      const blocked = new Set()

      // Procesar reservas de Supabase
      reservations?.forEach(r => {
        const days = eachDayOfInterval({
          start: localDate(r.start_date),
          end: localDate(r.end_date),
        })
        days.forEach(d => {
          const key = `${format(d, 'yyyy-MM-dd')}:${r.slot_type}`
          blocked.add(key)
          if (r.slot_type === 'full_day') {
            blocked.add(`${format(d, 'yyyy-MM-dd')}:half_day_morning`)
            blocked.add(`${format(d, 'yyyy-MM-dd')}:half_day_afternoon`)
          }
        })
      })

      // Procesar eventos de Google Calendar
      calendarBlocked.forEach(r => {
        const days = eachDayOfInterval({
          start: localDate(r.start_date),
          end: localDate(r.end_date),
        })
        days.forEach(d => {
          const dateStr = format(d, 'yyyy-MM-dd')
          blocked.add(`${dateStr}:${r.slot_type}`)
          if (r.slot_type === 'full_day') {
            blocked.add(`${dateStr}:half_day_morning`)
            blocked.add(`${dateStr}:half_day_afternoon`)
          } else {
            // Si bloquea mañana o tarde, también bloquea full_day
            blocked.add(`${dateStr}:full_day`)
          }
        })
      })

      setBlockedDates(blocked)
    } catch (err) {
      console.error('Error fetching availability:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBlockedDates()

    // Realtime de Supabase para reservas nuevas
    const channel = supabase
      .channel('availability-watcher')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, fetchBlockedDates)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchBlockedDates])

  const isDateBlocked = useCallback((date, slotType = 'full_day') => {
    const dateStr = format(date, 'yyyy-MM-dd')
    if (slotType === 'full_day') {
      return (
        blockedDates.has(`${dateStr}:full_day`) ||
        blockedDates.has(`${dateStr}:half_day_morning`) ||
        blockedDates.has(`${dateStr}:half_day_afternoon`)
      )
    }
    if (slotType === 'half_day_morning') {
      return blockedDates.has(`${dateStr}:half_day_morning`) || blockedDates.has(`${dateStr}:full_day`)
    }
    if (slotType === 'half_day_afternoon') {
      return blockedDates.has(`${dateStr}:half_day_afternoon`) || blockedDates.has(`${dateStr}:full_day`)
    }
    return false
  }, [blockedDates])

  const isRangeAvailable = useCallback((from, to, slotType) => {
    if (!from) return true
    const end = to || from
    const days = eachDayOfInterval({ start: from, end })
    return days.every(d => !isDateBlocked(d, slotType))
  }, [isDateBlocked])

  return { blockedDates, loading, isDateBlocked, isRangeAvailable, refresh: fetchBlockedDates }
}
