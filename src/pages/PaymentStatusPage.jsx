import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import WhatsAppButton from '../components/WhatsAppButton'
import axios from 'axios'

export default function PaymentStatusPage() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') // 'approved', 'pending', 'failure'
  const paymentId = searchParams.get('payment_id')
  const reservationId = searchParams.get('reservation_id')

  const [loading, setLoading] = useState(false)
  const [reservation, setReservation] = useState(null)

  useEffect(() => {
    if (reservationId) {
      setLoading(true)
      axios.get(`/api/reservations/${reservationId}`)
        .then(r => setReservation(r.data))
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [reservationId])

  if (status === 'approved' || status === 'success') {
    return <SuccessView reservation={reservation} loading={loading} />
  }

  if (status === 'pending') {
    return <PendingView reservation={reservation} loading={loading} />
  }

  return <FailureView />
}

function SuccessView({ reservation, loading }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem' }}>
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
        {/* Check icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(76,175,80,0.12)',
            border: '1px solid rgba(76,175,80,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem',
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#81c784" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>

        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', marginBottom: '0.75rem' }}>
          ¡Reserva confirmada!
        </h1>
        <div className="gold-line" style={{ margin: '0 auto 1.5rem' }} />
        <p style={{ color: 'var(--app-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Tu seña fue procesada correctamente. La fecha quedó bloqueada en nuestro calendario
          y recibirás un email de confirmación en los próximos minutos.
        </p>

        {loading && (
          <div style={{ color: 'var(--app-dim)', marginBottom: '1.5rem' }}>
            <span className="spinner" style={{ margin: '0 auto' }} />
          </div>
        )}

        {reservation && (
          <div
            className="card card-gold"
            style={{ textAlign: 'left', marginBottom: '2rem' }}
          >
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#f0f0f0' }}>Detalle de la reserva</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
              <InfoRow label="Cliente" value={`${reservation.first_name} ${reservation.last_name}`} />
              <InfoRow label="Email" value={reservation.email} />
              <InfoRow label="Fechas" value={`${reservation.start_date} → ${reservation.end_date}`} />
              <InfoRow label="Evento" value={reservation.event_type} />
              <InfoRow label="Estado" value={<span className="badge badge-green">Seña abonada</span>} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--app-muted)' }}>
            Recordá que el saldo restante debe abonarse <strong>5 días antes</strong> del evento.
            Nos contactaremos con vos por email y WhatsApp para coordinar los detalles.
          </p>
          <Link to="/" className="btn btn-outline">
            Volver al inicio
          </Link>
        </div>
      </div>
      <WhatsAppButton variant="float" />
    </div>
  )
}

function PendingView({ reservation }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem' }}>
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(66,165,245,0.1)',
            border: '1px solid rgba(66,165,245,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem',
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#90caf9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>

        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', marginBottom: '0.75rem' }}>
          Pago en proceso
        </h1>
        <p style={{ color: 'var(--app-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Tu pago está siendo procesado. Esto puede demorar algunos minutos.
          Te notificaremos por email cuando se confirme.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-ghost">Volver al inicio</Link>
          <WhatsAppButton variant="inline" message="Hola, hice una reserva y el pago quedó pendiente. ¿Me pueden confirmar?" />
        </div>
      </div>
      <WhatsAppButton variant="float" />
    </div>
  )
}

function FailureView() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem' }}>
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'rgba(224,85,85,0.1)',
            border: '1px solid rgba(224,85,85,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 2rem',
          }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ef9a9a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </div>

        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', marginBottom: '0.75rem' }}>
          El pago no se completó
        </h1>
        <p style={{ color: 'var(--app-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
          Hubo un problema al procesar tu pago. La fecha <strong>no fue reservada</strong>.
          Podés intentarlo de nuevo o contactarnos directamente.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/reservar" className="btn btn-gold">Intentar de nuevo</Link>
          <WhatsAppButton variant="inline" message="Hola, intenté hacer una reserva pero el pago falló. ¿Me pueden ayudar?" />
        </div>
      </div>
      <WhatsAppButton variant="float" />
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right', color: '#f0f0f0' }}>{value}</span>
    </div>
  )
}
