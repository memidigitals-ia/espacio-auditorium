import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { format, parseISO, addDays, addMonths, isValid, startOfToday } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import BookingCalendar from '../components/BookingCalendar'
import BookingForm from '../components/BookingForm'
import PriceBreakdown from '../components/PriceBreakdown'
import WhatsAppButton from '../components/WhatsAppButton'
import { useAvailability } from '../hooks/useAvailability'
import { calculatePrice, getDaysCount, formatARS, DURATION_LABELS, TIME_SLOTS, PRICES, LIMITS, DURATION_TYPES, SLOT_TYPES } from '../lib/pricing'

const STEPS = ['Fechas', 'Datos', 'Pago']
const GENERIC_ERROR = 'No pudimos procesar la reserva. Intentá de nuevo en unos minutos.'

/** Sanitiza los query params del cotizador: nunca confiamos en la URL. */
function parseQuery(searchParams) {
  const today = startOfToday()
  const minDate = addDays(today, LIMITS.minDaysAhead)
  const maxDate = addMonths(today, LIMITS.maxMonthsAhead)

  const durationRaw = searchParams.get('duration')
  const durationType = DURATION_TYPES.includes(durationRaw) ? durationRaw : 'full_day'

  const slotRaw = searchParams.get('slot')
  let slotType = durationType === 'full_day' ? 'full_day' : 'half_day_morning'
  if (durationType === 'half_day' && SLOT_TYPES.includes(slotRaw) && slotRaw !== 'full_day') slotType = slotRaw

  const hoursRaw = Number.parseInt(searchParams.get('hours') || '0', 10)
  const additionalHours = Number.isInteger(hoursRaw) ? Math.min(LIMITS.maxAdditionalHours, Math.max(0, hoursRaw)) : 0

  const daysRaw = Number.parseInt(searchParams.get('days') || '1', 10)
  const days = Number.isInteger(daysRaw) ? Math.min(LIMITS.maxDays, Math.max(1, daysRaw)) : 1

  let range = { from: undefined, to: undefined }
  const fromRaw = searchParams.get('from') || ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromRaw)) {
    const from = parseISO(fromRaw)
    if (isValid(from) && from >= minDate && from <= maxDate) {
      range = { from, to: days > 1 ? addDays(from, days - 1) : undefined }
    }
  }

  const personasRaw = Number.parseInt(searchParams.get('personas') || '', 10)
  const personas = Number.isInteger(personasRaw) && personasRaw > 0 && personasRaw <= 500 ? personasRaw : null

  return { durationType, slotType, additionalHours, range, personas }
}

export default function BookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const init = useMemo(() => parseQuery(searchParams), [searchParams])

  const [step, setStep] = useState(0)
  const [durationType, setDurationType] = useState(init.durationType)
  const [slotType, setSlotType] = useState(init.slotType)
  const [additionalHours, setAdditionalHours] = useState(init.additionalHours)
  const [dateRange, setDateRange] = useState(init.range)
  const [isLoading, setIsLoading] = useState(false)
  const [paymentError, setPaymentError] = useState(null)   // { title, message, action? }
  const [serverFieldError, setServerFieldError] = useState(null)
  const [turnstileReset, setTurnstileReset] = useState(0)
  const submittingRef = useRef(false)

  const { isRangeAvailable, isDateBlocked, loading: availabilityLoading, error: availabilityError, refresh } = useAvailability()

  const days = getDaysCount(dateRange?.from, dateRange?.to || dateRange?.from)
  const pricing = durationType ? calculatePrice({ durationType, days, additionalHours }) : null

  const handleDurationChange = (type) => {
    setDurationType(type)
    setSlotType(type === 'full_day' ? 'full_day' : 'half_day_morning')
  }

  const handleRangeChange = useCallback((range) => {
    setDateRange(range || { from: undefined, to: undefined })
  }, [])

  const selectedBlocked = Boolean(dateRange?.from) && !isRangeAvailable(dateRange.from, dateRange.to || dateRange.from, slotType)
  const canContinue = Boolean(dateRange?.from) && !selectedBlocked && !availabilityError && !availabilityLoading

  const handleContinueToForm = () => {
    if (!dateRange?.from) {
      toast.error('Seleccioná al menos una fecha')
      return
    }
    if (availabilityError) {
      toast.error('No pudimos verificar la disponibilidad. Reintentá en unos segundos.')
      return
    }
    if (selectedBlocked) {
      toast.error('Una o más fechas del rango ya no están disponibles. Elegí otras fechas.')
      return
    }
    setPaymentError(null)
    setServerFieldError(null)
    setStep(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBackToDates = () => {
    setPaymentError(null)
    setServerFieldError(null)
    setStep(0)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleFormSubmit = async (formData) => {
    if (submittingRef.current) return   // bloqueo de doble envío
    submittingRef.current = true
    setIsLoading(true)
    setPaymentError(null)
    setServerFieldError(null)

    let redirecting = false
    try {
      const payload = {
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to || dateRange.from, 'yyyy-MM-dd'),
        durationType,
        slotType,
        additionalHours,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        whatsapp: formData.whatsapp,
        eventType: formData.eventType,
        notes: formData.notes || '',
        policyAccepted: formData.policyAccepted === true,
        coupon: formData.coupon || '',
        turnstileToken: formData.turnstileToken || '',
      }

      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && data?.initPoint) {
        if (typeof window.fbq === 'function') {
          window.fbq('track', 'InitiateCheckout', {
            value: Math.round(pricing?.deposit || 0),
            currency: 'ARS',
            content_name: 'Reserva Espacio Auditorium',
            num_items: days,
          }, data.reservationId ? { eventID: `ic_${data.reservationId}` } : undefined)
        }
        redirecting = true
        window.location.assign(data.initPoint)
        return
      }

      const serverMsg = typeof data?.error === 'string' && data.error.length < 300 ? data.error : ''

      if (res.status === 400) {
        const message = serverMsg || 'Revisá los datos ingresados.'
        if (data?.field) setServerFieldError({ field: data.field, message })
        const dateFields = ['startDate', 'endDate', 'durationType', 'slotType', 'additionalHours']
        setPaymentError({
          title: 'Revisá los datos',
          message,
          action: dateFields.includes(data?.field) ? 'dates' : null,
        })
      } else if (res.status === 409) {
        await refresh()
        setPaymentError({
          title: 'La fecha ya no está disponible',
          message: serverMsg || 'Alguien reservó esa fecha hace instantes. Elegí otra fecha en el calendario.',
          action: 'dates',
        })
      } else if (res.status === 429) {
        setPaymentError({
          title: 'Demasiados intentos',
          message: serverMsg || 'Superaste la cantidad de intentos permitidos. Esperá unos minutos o escribinos por WhatsApp.',
        })
      } else if (res.status === 503) {
        setPaymentError({
          title: 'No pudimos verificar la disponibilidad',
          message: serverMsg || 'Nuestro calendario no responde en este momento. Reintentá en unos minutos o escribinos por WhatsApp.',
        })
      } else if (res.status === 403) {
        setPaymentError({
          title: 'Verificación de seguridad',
          message: serverMsg || 'No pudimos validar la verificación de seguridad. Volvé a intentarlo.',
        })
      } else {
        setPaymentError({ title: 'Error al procesar el pago', message: serverMsg || GENERIC_ERROR })
      }
      toast.error(serverMsg || GENERIC_ERROR)
      setTurnstileReset(n => n + 1)
    } catch (err) {
      console.error('[booking] error de red:', err?.message || err)
      setPaymentError({ title: 'Sin conexión', message: 'No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.' })
      toast.error('No pudimos conectarnos con el servidor.')
      setTurnstileReset(n => n + 1)
    } finally {
      // Si estamos redirigiendo a Mercado Pago, el botón queda deshabilitado (evita duplicados).
      if (!redirecting) {
        submittingRef.current = false
        setIsLoading(false)
      }
    }
  }

  const defaultNotes = init.personas ? `Cantidad estimada: ${init.personas} personas.` : ''

  return (
    <div className="app-page" style={{ paddingBottom: '6rem' }}>
      <Helmet>
        <title>Reservar Auditorio en Recoleta — Precio Instantáneo | Espacio Auditorium</title>
        <meta name="description" content="Reservá tu auditorio en Recoleta con el 30% de seña por Mercado Pago. Precio al instante, sin llamadas. 3 salas incluidas para hasta 36 personas. CABA." />
        <link rel="canonical" href="https://www.espacioauditorium.com.ar/reservar" />
      </Helmet>

      {/* Header */}
      <div
        style={{
          borderBottom: '1px solid #1a1a1a',
          padding: '1.25rem 1.25rem',
          position: 'sticky',
          top: 0,
          background: 'rgba(10,10,10,0.95)',
          backdropFilter: 'blur(10px)',
          zIndex: 100,
        }}
      >
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={() => (step > 0 ? goBackToDates() : navigate('/'))}
            className="btn btn-ghost-app btn-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {step > 0 ? 'Atrás' : 'Inicio'}
          </button>

          <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: 'var(--app-muted)' }}>
            Espacio Auditorium
          </span>

          <div style={{ width: 80 }} />
        </div>
      </div>

      <div className="container" style={{ paddingTop: '2.5rem' }}>
        {/* Pasos */}
        <ol className="steps" aria-label="Pasos de la reserva">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`step-item ${i === step ? 'active' : i < step ? 'done' : ''}`}
              aria-current={i === step ? 'step' : undefined}
            >
              <div className="step-num" aria-hidden="true">
                {i < step ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className="step-label">{label}</span>
            </li>
          ))}
        </ol>

        {/* Paso 0: Fechas */}
        {step === 0 && (
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', marginBottom: '0.5rem' }}>
                ¿Cuándo es tu evento?
              </h1>
              <p style={{ color: 'var(--app-muted)' }}>
                Los días tachados ya están ocupados o bloqueados
              </p>
            </div>

            {/* Tipo de jornada */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <p className="form-label" id="duration-label" style={{ marginBottom: '1rem' }}>Tipo de jornada</p>
              <div role="group" aria-labelledby="duration-label" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { value: 'half_day', label: 'Media jornada', sub: `4 hs · ${formatARS(PRICES.HALF_DAY)}+IVA` },
                  { value: 'full_day', label: 'Jornada completa', sub: `8 hs · ${formatARS(PRICES.FULL_DAY)}+IVA` },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={durationType === opt.value}
                    onClick={() => handleDurationChange(opt.value)}
                    className={`toggle-card ${durationType === opt.value ? 'is-active' : ''}`}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gold)', marginTop: '0.2rem' }}>{opt.sub}</div>
                  </button>
                ))}
              </div>

              {/* Turno media jornada */}
              {durationType === 'half_day' && (
                <div style={{ marginTop: '1rem' }}>
                  <p className="form-label" id="slot-label" style={{ marginBottom: '0.75rem' }}>Horario</p>
                  <div role="group" aria-labelledby="slot-label" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {['half_day_morning', 'half_day_afternoon'].map(slot => (
                      <button
                        key={slot}
                        type="button"
                        aria-pressed={slotType === slot}
                        onClick={() => setSlotType(slot)}
                        className={`toggle-card toggle-card-sm ${slotType === slot ? 'is-active' : ''}`}
                      >
                        {TIME_SLOTS[slot].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Horas adicionales */}
              <div style={{ marginTop: '1rem' }}>
                <p className="form-label" id="hours-label" style={{ marginBottom: '0.5rem' }}>
                  Horas adicionales (opcional) — {formatARS(PRICES.EXTRA_HOUR)}+IVA/h
                </p>
                <div role="group" aria-labelledby="hours-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost-app btn-sm"
                    onClick={() => setAdditionalHours(h => Math.max(0, h - 1))}
                    disabled={additionalHours === 0}
                    aria-label="Quitar una hora adicional"
                  >
                    −
                  </button>
                  <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }} aria-live="polite" aria-atomic="true">
                    {additionalHours}
                  </span>
                  <button
                    type="button"
                    className="btn btn-ghost-app btn-sm"
                    onClick={() => setAdditionalHours(h => Math.min(LIMITS.maxAdditionalHours, h + 1))}
                    disabled={additionalHours >= LIMITS.maxAdditionalHours}
                    aria-label="Agregar una hora adicional"
                  >
                    +
                  </button>
                  <span style={{ fontSize: '0.82rem', color: 'var(--app-dim)' }}>hs adicionales (máx. {LIMITS.maxAdditionalHours})</span>
                </div>
              </div>
            </div>

            {/* Calendario */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <BookingCalendar
                slotType={slotType}
                onSelect={handleRangeChange}
                isDateBlocked={isDateBlocked}
                loading={availabilityLoading}
                range={dateRange}
                setRange={handleRangeChange}
              />
            </div>

            {availabilityError && (
              <div role="alert" className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.35rem' }}>No pudimos verificar la disponibilidad</p>
                <p style={{ marginBottom: '0.9rem' }}>
                  Nuestro calendario no responde en este momento, así que no podemos confirmar fechas online.
                  Reintentá en unos segundos o escribinos y te confirmamos por WhatsApp.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => refresh()}>Reintentar</button>
                  <WhatsAppButton variant="inline" message="Hola, quiero reservar una fecha pero el calendario del sitio no carga. ¿Me confirman disponibilidad?" />
                </div>
              </div>
            )}

            {/* Precio */}
            {dateRange?.from && pricing && (
              <PriceBreakdown durationType={durationType} days={days} additionalHours={additionalHours} />
            )}

            {/* Continuar */}
            <button
              type="button"
              className="btn btn-gold btn-lg btn-full"
              style={{ marginTop: '1.5rem' }}
              onClick={handleContinueToForm}
              disabled={!canContinue}
            >
              {availabilityError
                ? 'Disponibilidad no verificada'
                : dateRange?.from && selectedBlocked
                  ? 'Fecha no disponible'
                  : 'Continuar'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <WhatsAppButton variant="inline" message="Hola, quiero consultar por una reserva en Espacio Auditorium." />
            </div>
          </div>
        )}

        {/* Paso 1: Formulario */}
        {step === 1 && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div
              className="card card-gold"
              style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--app-muted)', marginBottom: '0.2rem' }}>
                  {DURATION_LABELS[durationType]}
                  {slotType !== 'full_day' && ` · ${TIME_SLOTS[slotType].label}`}
                  {additionalHours > 0 && ` · +${additionalHours} h`}
                </p>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem' }}>
                  {dateRange.from && format(dateRange.from, "d 'de' MMMM", { locale: es })}
                  {dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime()
                    ? <> → {format(dateRange.to, "d 'de' MMMM yyyy", { locale: es })}</>
                    : <> · {format(dateRange.from, 'yyyy')}</>}
                </p>
                <button type="button" className="link-button" onClick={goBackToDates} style={{ marginTop: '0.35rem' }}>
                  Cambiar fecha
                </button>
              </div>
              {pricing && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>Seña ({PRICES.DEPOSIT_RATE * 100}%)</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--gold)', fontWeight: 700 }}>
                    {formatARS(pricing.deposit)}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 1.9rem)', marginBottom: '0.5rem' }}>
                Datos de la reserva
              </h1>
              <p style={{ color: 'var(--app-muted)', fontSize: '0.9rem' }}>
                Completá el formulario y después pagás la seña del {PRICES.DEPOSIT_RATE * 100}% con Mercado Pago.
              </p>
            </div>

            <div className="card">
              <BookingForm
                onSubmit={handleFormSubmit}
                isLoading={isLoading}
                serverError={serverFieldError}
                resetToken={turnstileReset}
                defaultNotes={defaultNotes}
              />
            </div>

            {paymentError && (
              <div role="alert" className="alert-box alert-error" style={{ marginTop: '1.5rem' }}>
                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{paymentError.title}</p>
                <p>{paymentError.message}</p>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  {paymentError.action === 'dates' && (
                    <button type="button" className="btn btn-outline btn-sm" onClick={goBackToDates}>
                      Elegir otra fecha
                    </button>
                  )}
                  <WhatsAppButton variant="inline" message="Hola, tuve un problema al intentar reservar y necesito ayuda." />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <WhatsAppButton variant="float" className="whatsapp-float-app" />
    </div>
  )
}
