import { useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'date-fns/locale'
import { format, addDays, addMonths, startOfToday, isValid } from 'date-fns'
import { getDaysCount, LIMITS } from '../lib/pricing'
import 'react-day-picker/style.css'

const rdpLabels = {
  labelPrevious: () => 'Mes anterior',
  labelNext: () => 'Mes siguiente',
  labelDayButton: (date, modifiers) => {
    const formatted = format(date, "d 'de' MMMM 'de' yyyy", { locale: es })
    if (modifiers?.disabled) return `${formatted}, no disponible`
    return modifiers?.today ? `Hoy, ${formatted}` : formatted
  },
}

export default function BookingCalendar({ slotType, onSelect, isDateBlocked, loading, range, setRange }) {
  const today = startOfToday()
  const minDate = useMemo(() => addDays(today, LIMITS.minDaysAhead), [today])
  const maxDate = useMemo(() => addMonths(today, LIMITS.maxMonthsAhead), [today])

  const disabledDays = useMemo(() => [
    { before: minDate },
    { after: maxDate },
    (date) => isDateBlocked(date, slotType),
  ], [minDate, maxDate, isDateBlocked, slotType])

  const handleSelect = (selected) => {
    let next = selected || { from: undefined, to: undefined }
    // Tope de días online (el server también lo valida)
    if (next.from && next.to && getDaysCount(next.from, next.to) > LIMITS.maxDays) {
      next = { from: next.from, to: addDays(next.from, LIMITS.maxDays - 1) }
    }
    setRange(next)
    if (next?.from) onSelect(next)
  }

  const hasFrom = range?.from && isValid(range.from)
  const days = hasFrom ? getDaysCount(range.from, range.to || range.from) : 0
  const isAvailable = hasFrom && !isDateBlocked(range.from, slotType)

  return (
    <div>
      {loading && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.82rem', color: 'var(--app-dim)' }}>
          <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} aria-hidden="true" />
          Verificando disponibilidad...
        </div>
      )}

      <DayPicker
        mode="range"
        locale={es}
        labels={rdpLabels}
        selected={range}
        onSelect={handleSelect}
        disabled={disabledDays}
        startMonth={today}
        endMonth={maxDate}
        showOutsideDays={false}
        fixedWeeks
        numberOfMonths={1}
      />

      <div aria-live="polite">
        {hasFrom && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            background: isAvailable ? 'rgba(76,175,80,0.08)' : 'rgba(224,85,85,0.08)',
            border: `1px solid ${isAvailable ? 'rgba(76,175,80,0.3)' : 'rgba(224,85,85,0.3)'}`,
            borderRadius: 'var(--radius)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1.1rem' }} aria-hidden="true">{isAvailable ? '✓' : '✗'}</span>
              <span style={{ fontSize: '0.9rem', color: isAvailable ? '#81c784' : '#ef9a9a', fontWeight: 600 }}>
                {isAvailable ? 'Fecha disponible' : 'Fecha no disponible'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--app-muted)' }}>
                {range.to && isValid(range.to) && range.from.getTime() !== range.to.getTime()
                  ? `${format(range.from, 'd MMM', { locale: es })} → ${format(range.to, 'd MMM yyyy', { locale: es })}`
                  : format(range.from, 'd MMMM yyyy', { locale: es })}
              </span>
              {days > 0 && <span className="badge badge-gold">{days} {days === 1 ? 'día' : 'días'}</span>}
            </div>
          </div>
        )}
      </div>

      {!hasFrom && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--app-dim)', textAlign: 'center' }}>
          Seleccioná una fecha — los días tachados no están disponibles
        </p>
      )}
    </div>
  )
}
