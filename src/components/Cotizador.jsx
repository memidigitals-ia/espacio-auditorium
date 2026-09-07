import { useId, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PRICES, LIMITS, formatARS } from '../lib/pricing'

// Cotizador de la Home: precios SIEMPRE desde lib/pricing.js (única fuente de verdad).

const DURATION_OPTIONS = [
  { value: 'half',   label: 'Media jornada — 4 horas' },
  { value: 'full',   label: 'Jornada completa — 8 horas' },
  { value: 'extra4', label: 'Jornada + 4 hs adicionales' },
  { value: 'dias2',  label: '2 días completos' },
  { value: 'dias3',  label: '3 días completos' },
  { value: 'dias4',  label: `4 días completos 🔥 -${PRICES.DISCOUNT_MULTI_DAY * 100}%` },
]

const HORARIOS = [
  { value: '8', label: '8:00' }, { value: '9', label: '9:00' },
  { value: '10', label: '10:00' }, { value: '11', label: '11:00' },
  { value: '12', label: '12:00' }, { value: '13', label: '13:00' },
  { value: '14', label: '14:00' }, { value: '15', label: '15:00' },
  { value: '16', label: '16:00' }, { value: '17', label: '17:00' },
]

const PERSONAS = [
  { value: '10', label: 'Hasta 10 personas' },
  { value: '20', label: 'Hasta 20 personas' },
  { value: '36', label: 'Hasta 36 personas' },
]

function pad(n) { return String(n).padStart(2, '0') }

// Fecha local (no UTC) — a las 21:00 ART "hoy" sigue siendo hoy.
function localIso(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function minBookableDate() {
  const d = new Date()
  d.setDate(d.getDate() + LIMITS.minDaysAhead)
  return localIso(d)
}

function maxBookableDate() {
  const d = new Date()
  d.setMonth(d.getMonth() + LIMITS.maxMonthsAhead)
  return localIso(d)
}

export function calcCotizacion(duracion) {
  if (!duracion) return null
  const { HALF_DAY, FULL_DAY, EXTRA_HOUR, DISCOUNT_MULTI_DAY } = PRICES
  let precio = 0
  let lineas = []
  let descuento = false

  switch (duracion) {
    case 'half':
      precio = HALF_DAY
      lineas = [{ label: 'Media jornada (4 horas)', valor: HALF_DAY }]
      break
    case 'full':
      precio = FULL_DAY
      lineas = [{ label: 'Jornada completa (8 horas)', valor: FULL_DAY }]
      break
    case 'extra4':
      precio = FULL_DAY + 4 * EXTRA_HOUR
      lineas = [
        { label: 'Jornada completa (8 hs)', valor: FULL_DAY },
        { label: '4 horas adicionales', valor: 4 * EXTRA_HOUR },
      ]
      break
    case 'dias2':
      precio = FULL_DAY * 2
      lineas = [{ label: '2 jornadas completas', valor: FULL_DAY * 2 }]
      break
    case 'dias3':
      precio = FULL_DAY * 3
      lineas = [{ label: '3 jornadas completas', valor: FULL_DAY * 3 }]
      break
    case 'dias4': {
      const bruto = FULL_DAY * 4
      const desc = bruto * DISCOUNT_MULTI_DAY
      precio = bruto - desc
      descuento = true
      lineas = [
        { label: '4 jornadas completas', valor: bruto },
        { label: `Descuento ${DISCOUNT_MULTI_DAY * 100}%`, valor: -desc },
      ]
      break
    }
    default:
      return null
  }
  return { precio, sena: precio * PRICES.DEPOSIT_RATE, lineas, descuento }
}

export function buildReservarParams({ fecha, duracion, horario, personas }) {
  const params = new URLSearchParams()
  if (fecha) params.set('from', fecha)
  switch (duracion) {
    case 'half':
      params.set('duration', 'half_day')
      params.set('slot', parseInt(horario, 10) >= 13 ? 'half_day_afternoon' : 'half_day_morning')
      break
    case 'extra4':
      params.set('duration', 'full_day')
      params.set('hours', '4')
      break
    case 'dias2':
      params.set('duration', 'full_day')
      params.set('days', '2')
      break
    case 'dias3':
      params.set('duration', 'full_day')
      params.set('days', '3')
      break
    case 'dias4':
      params.set('duration', 'full_day')
      params.set('days', '4')
      break
    default:
      params.set('duration', 'full_day')
  }
  if (personas) params.set('personas', personas)
  return params
}

export default function Cotizador() {
  const navigate = useNavigate()
  const [fecha, setFecha] = useState('')
  const [duracion, setDuracion] = useState('')
  const [horario, setHorario] = useState('')
  const [personas, setPersonas] = useState('')
  const ids = { fecha: useId(), duracion: useId(), horario: useId(), personas: useId() }

  const cotizacion = useMemo(() => (fecha && duracion ? calcCotizacion(duracion) : null), [fecha, duracion])
  const minDate = useMemo(minBookableDate, [])
  const maxDate = useMemo(maxBookableDate, [])

  return (
    <div className="cotizador-box">
      <div className="cotizador-form">
        <FormGroup id={ids.fecha} label="Fecha del evento">
          <input
            id={ids.fecha}
            type="date"
            min={minDate}
            max={maxDate}
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            className="cotizador-input"
          />
        </FormGroup>
        <FormGroup id={ids.duracion} label="Duración">
          <select id={ids.duracion} value={duracion} onChange={e => setDuracion(e.target.value)} className="cotizador-input">
            <option value="">— Elegí —</option>
            {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormGroup>
        <FormGroup id={ids.horario} label="Horario de inicio">
          <select id={ids.horario} value={horario} onChange={e => setHorario(e.target.value)} className="cotizador-input">
            <option value="">— Elegí —</option>
            {HORARIOS.map(o => <option key={o.value} value={o.value}>{o.label} hs</option>)}
          </select>
        </FormGroup>
        <FormGroup id={ids.personas} label="Cantidad de personas (aprox.)">
          <select id={ids.personas} value={personas} onChange={e => setPersonas(e.target.value)} className="cotizador-input">
            <option value="">— Elegí —</option>
            {PERSONAS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormGroup>
      </div>

      <div aria-live="polite">
        {cotizacion && (
          <div className="cotizador-result">
            <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16, display: 'block' }}>Tu cotización</span>

            {cotizacion.descuento && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--gold)', color: 'var(--black)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 1, marginBottom: 16 }}>
                🔥 {PRICES.DISCOUNT_MULTI_DAY * 100}% OFF incluido
              </span>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #222' }}>
              {cotizacion.lineas.map((l) => (
                <div key={l.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: l.valor < 0 ? '#81c784' : '#bdbdbd' }}>
                  <span>{l.label}</span>
                  <span>{formatARS(l.valor)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: 'white', fontWeight: 500 }}>
                <span>Total (sin IVA)</span>
                <span>{formatARS(cotizacion.precio)}</span>
              </div>
            </div>

            <div>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 400, color: 'white', display: 'block', marginBottom: 6 }}>
                {formatARS(cotizacion.precio)}
              </span>
              <span style={{ fontSize: 13, color: 'var(--dark-muted)' }}>+ IVA ({PRICES.IVA_RATE * 100}%) · Precio por el espacio completo</span>
            </div>

            <div style={{ background: '#111', borderRadius: 2, padding: '16px 20px', marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--dark-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>Seña para reservar ({PRICES.DEPOSIT_RATE * 100}%)</span>
                <span style={{ fontSize: 11, color: 'var(--dark-muted)' }}>Congela precio y fecha</span>
              </div>
              <span style={{ fontSize: 20, fontWeight: 500, color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>{formatARS(cotizacion.sena)}</span>
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ width: '100%', marginTop: 24, padding: 18, fontSize: 13, letterSpacing: '0.12em', borderRadius: 2 }}
              onClick={() => navigate(`/reservar?${buildReservarParams({ fecha, duracion, horario, personas }).toString()}`)}
            >
              Reservar esta fecha →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function FormGroup({ id, label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label htmlFor={id} style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--light-muted)' }}>{label}</label>
      {children}
    </div>
  )
}
