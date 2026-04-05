import { useForm } from 'react-hook-form'

const EVENT_TYPES = [
  'Conferencia / Charla',
  'Capacitación / Taller',
  'Presentación corporativa',
  'Evento social / Celebración',
  'Show / Espectáculo',
  'Filmación / Producción',
  'Otro',
]

export default function BookingForm({ onSubmit, isLoading }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="firstName">Nombre *</label>
          <input
            id="firstName"
            className={`form-input ${errors.firstName ? 'error' : ''}`}
            placeholder="Juan"
            {...register('firstName', { required: 'Requerido' })}
          />
          {errors.firstName && <span className="form-error">{errors.firstName.message}</span>}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="lastName">Apellido *</label>
          <input
            id="lastName"
            className={`form-input ${errors.lastName ? 'error' : ''}`}
            placeholder="Pérez"
            {...register('lastName', { required: 'Requerido' })}
          />
          {errors.lastName && <span className="form-error">{errors.lastName.message}</span>}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="email">Email *</label>
        <input
          id="email"
          type="email"
          className={`form-input ${errors.email ? 'error' : ''}`}
          placeholder="juan@ejemplo.com"
          {...register('email', {
            required: 'Requerido',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' },
          })}
        />
        {errors.email && <span className="form-error">{errors.email.message}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="whatsapp">WhatsApp *</label>
        <input
          id="whatsapp"
          type="tel"
          className={`form-input ${errors.whatsapp ? 'error' : ''}`}
          placeholder="+54 11 1234-5678"
          {...register('whatsapp', {
            required: 'Requerido',
            minLength: { value: 8, message: 'Número muy corto' },
          })}
        />
        {errors.whatsapp && <span className="form-error">{errors.whatsapp.message}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="eventType">Tipo de evento *</label>
        <select
          id="eventType"
          className={`form-input ${errors.eventType ? 'error' : ''}`}
          {...register('eventType', { required: 'Seleccioná un tipo de evento' })}
        >
          <option value="">Seleccioná una opción</option>
          {EVENT_TYPES.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {errors.eventType && <span className="form-error">{errors.eventType.message}</span>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="notes">Descripción del evento (opcional)</label>
        <textarea
          id="notes"
          className="form-input"
          placeholder="Contanos más sobre tu evento, cantidad estimada de personas, necesidades especiales..."
          rows={3}
          style={{ resize: 'vertical' }}
          {...register('notes')}
        />
      </div>

      <div className="form-group" style={{ marginTop: '0.5rem' }}>
        <label className="checkbox-label">
          <input
            type="checkbox"
            {...register('policyAccepted', { required: 'Debés aceptar la política de cancelación para continuar' })}
          />
          <span>
            Acepto la{' '}
            <strong style={{ color: 'var(--gold)' }}>política de cancelación</strong>:
            La seña del 30% no es reembolsable en caso de cancelación con menos de 15 días de anticipación.
            El saldo debe abonarse hasta 5 días antes del evento.
            En caso de cancelación con más de 15 días, se devuelve el 50% de la seña.
          </span>
        </label>
        {errors.policyAccepted && (
          <span className="form-error" style={{ marginLeft: '30px' }}>
            {errors.policyAccepted.message}
          </span>
        )}
      </div>

      <button
        type="submit"
        className="btn btn-gold btn-lg btn-full"
        disabled={isLoading}
        style={{ marginTop: '0.5rem' }}
      >
        {isLoading ? (
          <>
            <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
            Procesando...
          </>
        ) : (
          <>
            Continuar al pago
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </>
        )}
      </button>
    </form>
  )
}
