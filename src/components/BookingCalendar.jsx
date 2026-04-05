import { useState, useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'date-fns/locale'
import { format, isBefore, startOfToday, eachDayOfInterval, addDays } from 'date-fns'
import { useAvailability } from '../hooks/useAvailability'
import { getDaysCount } from '../lib/pricing'
import 'react-day-picker/dist/style.css'

export default function BookingCalendar({ slotType, onSelect }) {
  const today = startOfToday()
  const [range, setRange] = useState({ from: undefined, to: undefined })
  const { isDateBlocked, loading } = useAvailability()

  // Días deshabilitados: pasados + bloqueados
  const disabledDays = useMemo(() => {
    return [
      { before: addDays(today, 1) }, // mínimo mañana
      (date) => isDateBlocked(date, slotType),
    ]
  }, [today, isDateBlocked, slotType])

  const handleSelect = (selected) => {
    setRange(selected || { from: undefined, to: undefined })
    if (selected?.from) {
      onSelect(selected)
    }
  }

  const days = range?.from
    ? getDaysCount(range.from, range.to || range.from)
    : 0

  return (
    <div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          Verificando disponibilidad...
        </div>
      ) : (
        <>
          <DayPicker
            mode="range"
            locale={es}
            selected={range}
            onSelect={handleSelect}
            disabled={disabledDays}
            showOutsideDays={false}
            fixedWeeks
            numberOfMonths={1}
            modifiersClassNames={{
              selected: 'rdp-day_selected',
              range_start: 'rdp-day_range_start',
              range_end: 'rdp-day_range_end',
              range_middle: 'rdp-day_range_middle',
            }}
          />

          {range?.from && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                background: 'var(--gold-dim)',
                border: '1px solid var(--gold-border)',
                borderRadius: 'var(--radius)',
                fontSize: '0.9rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <span style={{ color: 'var(--text-muted)' }}>
                {range.to && range.from !== range.to
                  ? `${format(range.from, 'd MMM', { locale: es })} → ${format(range.to, 'd MMM yyyy', { locale: es })}`
                  : format(range.from, 'd MMMM yyyy', { locale: es })}
              </span>
              <span className="badge badge-gold">{days} {days === 1 ? 'día' : 'días'}</span>
            </div>
          )}

          <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center' }}>
            Hacé clic en una fecha de inicio y luego en la fecha de fin para eventos de múltiples días
          </p>
        </>
      )}
    </div>
  )
}
