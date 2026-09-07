import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { CANCELLATION_POLICY, LIMITS } from '../lib/pricing'
import Turnstile, { hasTurnstile } from './Turnstile'

// Debe coincidir con EVENT_TYPES de api/_validate.js
export const EVENT_TYPES = [
  'Conferencia / Charla',
  'Capacitación / Taller',
  'Presentación corporativa',
  'Evento social / Celebración',
  'Show / Espectáculo',
  'Filmación / Producción',
  'Otro',
]

// Alineado con api/_validate.js: EMAIL_RE, NAME_RE, normalizePhone (8–15 dígitos)
const EMAIL_RE = /^[^\s@,;<>()[\]\\"]+@[^\s@,;<>()[\]\\"]+\.[A-Za-z]{2,}$/
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]{0,79}$/u
const COUPON_RE = /^[A-Z0-9_-]{0,32}$/

function phoneDigits(v) {
  return String(v || '').replace(/\D/g, '')
}

/**
 * @param {object} props
 * @param {(data: object) => void} props.onSubmit
 * @param {boolean} props.isLoading
 * @param {{field:string, message:string}|null} [props.serverError] error 400 del server (campo + mensaje)
 * @param {number} [props.resetToken] cambia para forzar un nuevo desafío de Turnstile
 * @param {string} [props.defaultNotes]
 */
export default function BookingForm({ onSubmit, isLoading, serverError = null, resetToken = 0, defaultNotes = '' }) {
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    watch,
    formState: { errors },
  } = useForm({ defaultValues: { notes: defaultNotes } })

  const [turnstileToken, setTurnstileToken] = useState('')
  const turnstileRequired = hasTurnstile()
  const notesValue = watch('notes') || ''

  // Errores 400 del server → se muestran en el campo correspondiente
  useEffect(() => {
    if (!serverError?.field) return
    const known = ['firstName', 'lastName', 'email', 'whatsapp', 'eventType', 'notes', 'policyAccepted', 'coupon']
    if (known.includes(serverError.field)) {
      setError(serverError.field, { type: 'server', message: serverError.message })
      try { setFocus(serverError.field) } catch { /* campo sin foco */ }
    }
  }, [serverError, setError, setFocus])

  const submit = (data) => {
    if (turnstileRequired && !turnstileToken) return
    onSubmit({
      ...data,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.trim().toLowerCase(),
      whatsapp: data.whatsapp.trim(),
      notes: (data.notes || '').trim(),
      coupon: (data.coupon || '').trim().toUpperCase(),
      turnstileToken,
    })
  }

  const disabled = isLoading || (turnstileRequired && !turnstileToken)

  return (
    <form onSubmit={handleSubmit(submit)} noValidate>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="firstName">Nombre *</label>
          <input
            id="firstName"
            className={`form-input ${errors.firstName ? 'error' : ''}`}
            placeholder="Juan"
            autoComplete="given-name"
            maxLength={LIMITS.name}
            aria-invalid={errors.firstName ? 'true' : 'false'}
            aria-describedby={errors.firstName ? 'firstName-error' : undefined}
            {...register('firstName', {
              required: 'Requerido',
              validate: v => NAME_RE.test(v.trim()) || 'Ingresá un nombre válido',
            })}
          />
          {errors.firstName && <span id="firstName-error" className="form-error">{errors.firstName.message}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="lastName">Apellido *</label>
          <input
            id="lastName"
            className={`form-input ${errors.lastName ? 'error' : ''}`}
            placeholder="Pérez"
            autoComplete="family-name"
            maxLength={LIMITS.name}
            aria-invalid={errors.lastName ? 'true' : 'false'}
            aria-describedby={errors.lastName ? 'lastName-error' : undefined}
            {...register('lastName', {
              required: 'Requerido',
              validate: v => NAME_RE.test(v.trim()) || 'Ingresá un apellido válido',
            })}
          />
          {errors.lastName && <span id="lastName-error" className="form-error">{errors.lastName.message}</span>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="email">Email *</label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          className={`form-input ${errors.email ? 'error' : ''}`}
          placeholder="juan@ejemplo.com"
          maxLength={LIMITS.email}
          aria-invalid={errors.email ? 'true' : 'false'}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email', {
            required: 'Requerido',
            validate: v => EMAIL_RE.test(v.trim()) || 'Ingresá un email válido',
          })}
        />
        {errors.email && <span id="email-error" className="form-error">{errors.email.message}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="whatsapp">WhatsApp *</label>
        <input
          id="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          className={`form-input ${errors.whatsapp ? 'error' : ''}`}
          placeholder="+54 9 11 1234-5678"
          maxLength={LIMITS.whatsapp}
          aria-invalid={errors.whatsapp ? 'true' : 'false'}
          aria-describedby={errors.whatsapp ? 'whatsapp-error' : 'whatsapp-hint'}
          {...register('whatsapp', {
            required: 'Requerido',
            validate: v => {
              const d = phoneDigits(v)
              if (d.length < 8) return 'Número muy corto (mínimo 8 dígitos)'
              if (d.length > 15) return 'Número demasiado largo'
              return true
            },
          })}
        />
        {errors.whatsapp
          ? <span id="whatsapp-error" className="form-error">{errors.whatsapp.message}</span>
          : <span id="whatsapp-hint" className="form-hint">Con código de área, sin el 15. Ej: 11 1234-5678</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="eventType">Tipo de evento *</label>
        <select
          id="eventType"
          className={`form-input ${errors.eventType ? 'error' : ''}`}
          aria-invalid={errors.eventType ? 'true' : 'false'}
          aria-describedby={errors.eventType ? 'eventType-error' : undefined}
          {...register('eventType', {
            required: 'Seleccioná un tipo de evento',
            validate: v => EVENT_TYPES.includes(v) || 'Seleccioná un tipo de evento',
          })}
        >
          <option value="">Seleccioná una opción</option>
          {EVENT_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {errors.eventType && <span id="eventType-error" className="form-error">{errors.eventType.message}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="notes">Descripción del evento (opcional)</label>
        <textarea
          id="notes"
          className={`form-input ${errors.notes ? 'error' : ''}`}
          placeholder="Contanos más sobre tu evento, cantidad estimada de personas, necesidades especiales..."
          rows={3}
          maxLength={LIMITS.notes}
          style={{ resize: 'vertical' }}
          aria-describedby="notes-count"
          {...register('notes', {
            maxLength: { value: LIMITS.notes, message: `Máximo ${LIMITS.notes} caracteres` },
          })}
        />
        <span id="notes-count" className="form-hint" style={{ textAlign: 'right' }}>
          {notesValue.length}/{LIMITS.notes}
        </span>
        {errors.notes && <span className="form-error">{errors.notes.message}</span>}
      </div>

      <div className="form-group" style={{ marginTop: '0.5rem' }}>
        <label className="checkbox-label">
          <input
            type="checkbox"
            aria-invalid={errors.policyAccepted ? 'true' : 'false'}
            aria-describedby={errors.policyAccepted ? 'policy-error' : undefined}
            {...register('policyAccepted', { required: 'Debés aceptar la política de cancelación para continuar' })}
          />
          <span>
            Acepto la{' '}
            <strong style={{ color: 'var(--gold)' }}>política de cancelación</strong>:{' '}
            {CANCELLATION_POLICY}
          </span>
        </label>
        {errors.policyAccepted && (
          <span id="policy-error" className="form-error" style={{ marginLeft: '30px' }}>
            {errors.policyAccepted.message}
          </span>
        )}
      </div>

      <div className="form-group" style={{ marginTop: '0.5rem' }}>
        <label className="form-label" htmlFor="coupon">Código de descuento (opcional)</label>
        <input
          id="coupon"
          className={`form-input ${errors.coupon ? 'error' : ''}`}
          placeholder="Ingresá tu código"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={LIMITS.coupon}
          style={{ textTransform: 'uppercase' }}
          aria-invalid={errors.coupon ? 'true' : 'false'}
          aria-describedby={errors.coupon ? 'coupon-error' : undefined}
          {...register('coupon', {
            validate: v => COUPON_RE.test((v || '').trim().toUpperCase()) || 'El código sólo admite letras, números, guiones y guión bajo',
          })}
        />
        {errors.coupon && <span id="coupon-error" className="form-error">{errors.coupon.message}</span>}
      </div>

      {turnstileRequired && (
        <div className="form-group" style={{ marginTop: '0.25rem' }}>
          <Turnstile onToken={setTurnstileToken} resetKey={resetToken} />
          {!turnstileToken && (
            <span className="form-hint">Completá la verificación de seguridad para continuar.</span>
          )}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-gold btn-lg btn-full"
        disabled={disabled}
        aria-busy={isLoading ? 'true' : 'false'}
        style={{ marginTop: '0.5rem' }}
      >
        {isLoading ? (
          <>
            <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} aria-hidden="true" />
            Procesando...
          </>
        ) : (
          <>
            Continuar al pago
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </>
        )}
      </button>
    </form>
  )
}
