import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format, parseISO, addDays } from 'date-fns'
import { es } from 'date-fns/locale'
import BookingCalendar from '../components/BookingCalendar'
import BookingForm from '../components/BookingForm'
import PriceBreakdown from '../components/PriceBreakdown'
import WhatsAppButton from '../components/WhatsAppButton'
import { useAvailability } from '../hooks/useAvailability'
import { calculatePrice, getDaysCount, DURATION_LABELS, TIME_SLOTS } from '../lib/pricing'
import axios from 'axios'
import toast from 'react-hot-toast'

const STEPS = ['Fechas', 'Detalles', 'Pago']

export default function BookingPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Pre-load from cotizador params
  const initFrom = searchParams.get('from')
  const initDuration = searchParams.get('duration') || 'full_day'
  const initSlot = searchParams.get('slot') || (initDuration === 'half_day' ? 'half_day_morning' : 'full_day')
  const initHours = parseInt(searchParams.get('hours') || '0')
  const initDays = parseInt(searchParams.get('days') || '1')

  const getInitDateRange = () => {
    if (!initFrom) return { from: undefined, to: undefined }
    const from = parseISO(initFrom)
    const to = initDays > 1 ? addDays(from, initDays - 1) : undefined
    return { from, to }
  }

  const [step, setStep] = useState(0)
  const [durationType, setDurationType] = useState(initDuration)
  const [slotType, setSlotType] = useState(initSlot)
  const [additionalHours, setAdditionalHours] = useState(initHours)
  const [dateRange, setDateRange] = useState(getInitDateRange)
  const [isLoading, setIsLoading] = useState(false)
  const [paymentError, setPaymentError] = useState(null)

  const { isRangeAvailable, isDateBlocked, loading: availabilityLoading } = useAvailability()

  const days = getDaysCount(dateRange?.from, dateRange?.to)
  const pricing = durationType ? calculatePrice({ durationType, days, additionalHours }) : null

  // Sync slotType with durationType
  const handleDurationChange = (type) => {
    setDurationType(type)
    if (type === 'full_day') setSlotType('full_day')
    else setSlotType('half_day_morning')
  }

  const handleDateSelect = (range) => {
    setDateRange(range || { from: undefined, to: undefined })
  }

  const handleCalendarRangeChange = (range) => {
    setDateRange(range || { from: undefined, to: undefined })
  }

  const handleContinueToForm = () => {
    if (!dateRange?.from) {
      toast.error('Seleccioná al menos una fecha')
      return
    }
    // Verify range is still available
    if (!isRangeAvailable(dateRange.from, dateRange.to || dateRange.from, slotType)) {
      toast.error('Una o más fechas del rango ya no están disponibles. Por favor elegí otras fechas.')
      return
    }
    setStep(1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleFormSubmit = async (formData) => {
    setIsLoading(true)
    setPaymentError(null)

    try {
      const payload = {
        // Booking details
        startDate: format(dateRange.from, 'yyyy-MM-dd'),
        endDate: format(dateRange.to || dateRange.from, 'yyyy-MM-dd'),
        durationType,
        slotType,
        additionalHours,
        days,
        // Pricing
        pricing,
        // Client data
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        whatsapp: formData.whatsapp,
        eventType: formData.eventType,
        notes: formData.notes || '',
        policyAccepted: formData.policyAccepted,
        policyAcceptedAt: new Date().toISOString(),
        coupon: formData.coupon || '',
      }

      const { data } = await axios.post('/api/create-payment', payload)

      if (data.initPoint) {
        // Meta Pixel: InitiateCheckout
        if (window.fbq) {
          window.fbq('track', 'InitiateCheckout', {
            value: pricing?.deposit || 0,
            currency: 'ARS',
            content_name: 'Reserva Espacio Auditorium',
            num_items: days,
          })
        }
        // Redirect to Mercado Pago
        window.location.href = data.initPoint
      } else {
        throw new Error('No se pudo iniciar el pago')
      }
    } catch (err) {
      console.error('Payment error:', err)
      const msg = err.response?.data?.error || err.message || 'Error al procesar. Intentá nuevamente.'
      setPaymentError(msg)
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '6rem' }}>
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
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate('/')}
            className="btn btn-ghost-app btn-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            {step > 0 ? 'Atrás' : 'Inicio'}
          </button>

          <span
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1rem',
              color: 'var(--app-muted)',
            }}
          >
            Espacio Auditorium
          </span>

          <div style={{ width: 80 }} />
        </div>
      </div>

      <div className="container" style={{ paddingTop: '2.5rem' }}>
        {/* Steps */}
        <div className="steps">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`step-item ${i === step ? 'active' : i < step ? 'done' : ''}`}
            >
              <div className="step-num">
                {i < step ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className="step-label">{label}</span>
            </div>
          ))}
        </div>

        {/* Step 0: Fechas */}
        {step === 0 && (
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', marginBottom: '0.5rem' }}>
                ¿Cuándo es tu evento?
              </h1>
              <p style={{ color: 'var(--app-muted)' }}>
                Las fechas bloqueadas ya tienen reserva confirmada
              </p>
            </div>

            {/* Duration type selector */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <p className="form-label" style={{ marginBottom: '1rem' }}>Tipo de jornada</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { value: 'half_day', label: 'Media jornada', sub: '4 hs · $520.000+IVA' },
                  { value: 'full_day', label: 'Jornada completa', sub: '8 hs · $780.000+IVA' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleDurationChange(opt.value)}
                    style={{
                      padding: '1rem',
                      border: `1px solid ${durationType === opt.value ? 'var(--gold-border)' : '#2a2a2a'}`,
                      borderRadius: 'var(--radius)',
                      background: durationType === opt.value ? 'var(--gold-dim)' : 'var(--bg-card2)',
                      color: durationType === opt.value ? 'var(--app-text)' : 'var(--app-muted)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'var(--transition)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{opt.label}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gold)', marginTop: '0.2rem' }}>{opt.sub}</div>
                  </button>
                ))}
              </div>

              {/* Half-day slot selector */}
              {durationType === 'half_day' && (
                <div style={{ marginTop: '1rem' }}>
                  <p className="form-label" style={{ marginBottom: '0.75rem' }}>Horario</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {['half_day_morning', 'half_day_afternoon'].map(slot => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSlotType(slot)}
                        style={{
                          padding: '0.75rem',
                          border: `1px solid ${slotType === slot ? 'var(--gold-border)' : '#2a2a2a'}`,
                          borderRadius: 'var(--radius)',
                          background: slotType === slot ? 'var(--gold-dim)' : 'var(--bg-card2)',
                          color: slotType === slot ? 'var(--app-text)' : 'var(--app-muted)',
                          cursor: 'pointer',
                          fontSize: '0.88rem',
                          transition: 'var(--transition)',
                        }}
                      >
                        {TIME_SLOTS[slot].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional hours */}
              <div style={{ marginTop: '1rem' }}>
                <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>
                  Horas adicionales (opcional) — $130.000+IVA/hs
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost-app btn-sm"
                    onClick={() => setAdditionalHours(h => Math.max(0, h - 1))}
                    disabled={additionalHours === 0}
                  >
                    −
                  </button>
                  <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>{additionalHours}</span>
                  <button
                    type="button"
                    className="btn btn-ghost-app btn-sm"
                    onClick={() => setAdditionalHours(h => Math.min(6, h + 1))}
                  >
                    +
                  </button>
                  <span style={{ fontSize: '0.82rem', color: 'var(--app-dim)' }}>hs adicionales</span>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <BookingCalendar
                slotType={slotType}
                onSelect={handleDateSelect}
                isDateBlocked={isDateBlocked}
                loading={availabilityLoading}
                range={dateRange}
                setRange={handleCalendarRangeChange}
              />
            </div>

            {/* Price preview */}
            {dateRange?.from && pricing && (
              <PriceBreakdown durationType={durationType} days={days} additionalHours={additionalHours} />
            )}

            {/* Continue button */}
            <button
              className="btn btn-gold btn-lg btn-full"
              style={{ marginTop: '1.5rem' }}
              onClick={handleContinueToForm}
              disabled={!dateRange?.from || (dateRange?.from && isDateBlocked(dateRange.from, slotType))}
            >
              {dateRange?.from && isDateBlocked(dateRange.from, slotType) ? 'Fecha no disponible' : 'Continuar'}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <WhatsAppButton variant="inline" />
            </div>
          </div>
        )}

        {/* Step 1: Formulario */}
        {step === 1 && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            {/* Summary card */}
            <div
              className="card card-gold"
              style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--app-muted)', marginBottom: '0.2rem' }}>
                  {DURATION_LABELS[durationType]}
                  {slotType !== 'full_day' && ` · ${TIME_SLOTS[slotType].label}`}
                </p>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem' }}>
                  {dateRange.from && format(dateRange.from, "d 'de' MMMM", { locale: es })}
                  {dateRange.to && dateRange.to !== dateRange.from && (
                    <> → {format(dateRange.to, "d 'de' MMMM yyyy", { locale: es })}</>
                  )}
                  {(!dateRange.to || dateRange.to === dateRange.from) && dateRange.from && (
                    <> · {format(dateRange.from, 'yyyy')}</>
                  )}
                </p>
              </div>
              {pricing && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--app-muted)' }}>Seña (30%)</div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: 'var(--gold)', fontWeight: 700 }}>
                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(pricing.deposit)}
                  </div>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: 'clamp(1.4rem, 3.5vw, 1.9rem)', marginBottom: '0.5rem' }}>
                Datos de la reserva
              </h1>
              <p style={{ color: 'var(--app-muted)', fontSize: '0.9rem' }}>
                Completá el formulario y luego pagarás la seña del 30% con Mercado Pago.
              </p>
            </div>

            <div className="card">
              <BookingForm onSubmit={handleFormSubmit} isLoading={isLoading} />
            </div>

            {paymentError && (
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  background: 'rgba(224,85,85,0.1)',
                  border: '1px solid rgba(224,85,85,0.25)',
                  borderRadius: 'var(--radius)',
                  color: '#ef9a9a',
                  fontSize: '0.9rem',
                }}
              >
                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Error al procesar el pago</p>
                <p>{paymentError}</p>
                <div style={{ marginTop: '1rem' }}>
                  <WhatsAppButton variant="inline" message="Hola, tuve un problema al intentar reservar y necesito ayuda." />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <WhatsAppButton variant="float" />
    </div>
  )
}
