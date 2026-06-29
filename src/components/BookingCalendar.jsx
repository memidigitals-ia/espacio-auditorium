import { useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import { es } from 'date-fns/locale'
import { format, addDays, startOfToday } from 'date-fns'

const rdpLabels = {
  labelPrev: () => 'Mes anterior',
  labelNext: () => 'Mes siguiente',
  labelDayButton: (date, modifiers) => {
    const formatted = format(date, "d 'de' MMMM 'de' yyyy", { locale: es })
    return modifiers?.today ? `Hoy, ${formatted}` : formatted
  },
}
import { getDaysCount } from '../lib/pricing'
import 'react-day-picker/dist/style.css'

export default function BookingCalendar({ slotType, onSelect, isDateBlocked, loading, range, setRange }) {
  const today = startOfToday()

  const disabledDays = useMemo(() => [
    { before: addDays(today, 1) },
    (date) => isDateBlocked(date, slotType),
  ], [today, isDateBlocked, slotType])

  const handleSelect = (selected) => {
    const next = selected || { from: undefined, to: undefined }
    setRange(next)
    if (next?.from) onSelect(next)
  }

  const days = range?.from ? getDaysCount(range.from, range.to || range.from) : 0
  const isAvailable = range?.from && !isDateBlocked(range.from, slotType)

  return (
    <div>
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.82rem', color: 'var(--app-dim)' }}>
          <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
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
            <span style={{ fontSize: '1.1rem' }}>{isAvailable ? '✓' : '✗'}</span>
            <span style={{ fontSize: '0.9rem', color: isAvailable ? '#81c784' : '#ef9a9a', fontWeight: 600 }}>
              {isAvailable ? 'Fecha disponible' : 'Fecha no disponible'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--app-muted)' }}>
              {range.to && range.from !== range.to
                ? `${format(range.from, 'd MMM', { locale: es })} → ${format(range.to, 'd MMM yyyy', { locale: es })}`
                : format(range.from, 'd MMMM yyyy', { locale: es })}
            </span>
            {days > 0 && <span className="badge badge-gold">{days} {days === 1 ? 'día' : 'días'}</span>}
          </div>
        </div>
      )}

      {!range?.from && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--app-dim)', textAlign: 'center' }}>
          Seleccioná una fecha — los días en gris no están disponibles
        </p>
      )}
    </div>
  )
}
