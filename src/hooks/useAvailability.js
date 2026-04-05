import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { format, eachDayOfInterval, parseISO } from 'date-fns'

/**
 * Hook para verificar disponibilidad de fechas en tiempo real
 */
export function useAvailability() {
  const [blockedDates, setBlockedDates] = useState(new Set())
  const [loading, setLoading] = useState(true)

  const fetchBlockedDates = useCallback(async () => {
    try {
      // Fechas bloqueadas por reservas confirmadas/pendientes de pago
      const { data: reservations, error: resError } = await supabase
        .from('reservations')
        .select('start_date, end_date, slot_type, status')
        .in('status', ['pending_payment', 'deposit_paid', 'confirmed'])

      if (resError) throw resError

      // Fechas bloqueadas manualmente por admin
      const { data: manualBlocks, error: blockError } = await supabase
        .from('blocked_dates')
        .select('date, slot_type')

      if (blockError) throw blockError

      const blocked = new Set()

      // Agregar fechas de reservas
      reservations?.forEach(r => {
        const days = eachDayOfInterval({
          start: parseISO(r.start_date),
          end: parseISO(r.end_date),
        })
        days.forEach(d => {
          const key = `${format(d, 'yyyy-MM-dd')}:${r.slot_type}`
          blocked.add(key)
          if (r.slot_type === 'full_day') {
            // Full day bloquea ambas mitades
            blocked.add(`${format(d, 'yyyy-MM-dd')}:half_day_morning`)
            blocked.add(`${format(d, 'yyyy-MM-dd')}:half_day_afternoon`)
          }
        })
      })

      // Agregar bloqueos manuales
      manualBlocks?.forEach(b => {
        const key = `${b.date}:${b.slot_type || 'full_day'}`
        blocked.add(key)
        blocked.add(`${b.date}:full_day`)
        blocked.add(`${b.date}:half_day_morning`)
        blocked.add(`${b.date}:half_day_afternoon`)
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

    // Suscripción realtime para actualizaciones instantáneas
    const channel = supabase
      .channel('availability')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, fetchBlockedDates)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blocked_dates' }, fetchBlockedDates)
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
      return (
        blockedDates.has(`${dateStr}:half_day_morning`) ||
        blockedDates.has(`${dateStr}:full_day`)
      )
    }

    if (slotType === 'half_day_afternoon') {
      return (
        blockedDates.has(`${dateStr}:half_day_afternoon`) ||
        blockedDates.has(`${dateStr}:full_day`)
      )
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
