import { useEffect, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import WhatsAppButton from '../components/WhatsAppButton'
import { formatARS, TIME_SLOTS } from '../lib/pricing'

// La vista sale SIEMPRE del estado real de la reserva (GET /api/reservations/:id?t=),
// nunca del parámetro `status` de la URL (que sólo decide si conviene seguir consultando).

const POLL_MS = 3000
const POLL_MAX_MS = 90 * 1000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const SESSION_KEY = 'ea_pago'

function readParams(searchParams) {
  const fromUrl = {
    id: searchParams.get('reservation_id') || '',
    t: searchParams.get('t') || '',
    status: (searchParams.get('status') || searchParams.get('collection_status') || '').toLowerCase(),
  }
  if (fromUrl.id) {
    // Guardamos en sessionStorage y limpiamos la URL: el id/token no van a analytics ni al historial.
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(fromUrl)) } catch { /* storage bloqueado */ }
    try { window.history.replaceState(null, '', '/pago') } catch { /* sin history */ }
    return fromUrl
  }
  try {
    const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
    if (saved && typeof saved.id === 'string') return saved
  } catch { /* storage bloqueado o inválido */ }
  return fromUrl
}

function formatDateEs(iso) {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || ''
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function PaymentStatusPage() {
  const [searchParams] = useSearchParams()
  const [params] = useState(() => readParams(searchParams))
  const { id, t, status: urlStatus } = params
  const validParams = UUID_RE.test(id) && typeof t === 'string' && t.length >= 16 && t.length <= 128

  const [reservation, setReservation] = useState(null)
  const [fetchState, setFetchState] = useState(validParams ? 'loading' : 'invalid') // loading | ok | notfound | error | invalid
  const [timedOut, setTimedOut] = useState(false)
  const purchaseFiredRef = useRef(false)

  const paidLikeUrl = urlStatus === 'approved' || urlStatus === 'success'
  const shouldPoll = validParams
    && paidLikeUrl
    && !timedOut
    && (fetchState === 'loading' || fetchState === 'error' || (fetchState === 'ok' && reservation?.status === 'pending_payment'))

  useEffect(() => {
    if (!validParams) return undefined
    let cancelled = false
    let timer = null
    const startedAt = Date.now()

    const load = async () => {
      try {
        const res = await fetch(`/api/reservations/${encodeURIComponent(id)}?t=${encodeURIComponent(t)}`, {
          headers: { Accept: 'application/json' },
          cache: 'no-store',
        })
        if (cancelled) return
        if (res.status === 404) { setFetchState('notfound'); return }
        if (!res.ok) throw new Error(`reservations ${res.status}`)
        const data = await res.json()
        if (cancelled) return
        setReservation(data)
        setFetchState('ok')
        if (data?.status !== 'pending_payment' || !paidLikeUrl) return
      } catch (err) {
        if (cancelled) return
        console.error('[pago] no se pudo consultar la reserva:', err?.message || err)
        setFetchState(prev => (prev === 'ok' ? 'ok' : 'error'))
        if (!paidLikeUrl) return
      }
      // Seguimos consultando mientras el pago se acredita (máx. 90 s)
      if (Date.now() - startedAt >= POLL_MAX_MS) { setTimedOut(true); return }
      timer = setTimeout(load, POLL_MS)
    }

    load()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, t, validParams])

  // Meta Pixel: Purchase una sola vez por reserva, sólo con seña acreditada.
  useEffect(() => {
    if (!reservation || purchaseFiredRef.current) return
    if (!['deposit_paid', 'confirmed'].includes(reservation.status)) return
    const key = `ea_purchase_${reservation.id}`
    let already = false
    try { already = sessionStorage.getItem(key) === '1' } catch { /* storage bloqueado */ }
    purchaseFiredRef.current = true
    if (already) return
    try { sessionStorage.setItem(key, '1') } catch { /* storage bloqueado */ }
    if (typeof window.fbq === 'function') {
      window.fbq('track', 'Purchase', {
        value: Math.round(Number(reservation.deposit_amount) || 0),
        currency: 'ARS',
        content_name: 'Reserva Espacio Auditorium',
        content_ids: [reservation.id],
        content_type: 'product',
      }, { eventID: reservation.id })
    }
  }, [reservation])

  const helmet = (
    <Helmet>
      <title>Estado de tu reserva | Espacio Auditorium</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  )

  if (!validParams) {
    return <>{helmet}<NotFoundView /></>
  }
  if (fetchState === 'notfound') {
    return <>{helmet}<NotFoundView /></>
  }
  if (fetchState === 'loading' || (fetchState === 'error' && shouldPoll)) {
    return <>{helmet}<VerifyingView /></>
  }
  if (fetchState === 'error') {
    return <>{helmet}<ErrorView /></>
  }

  const st = reservation?.status
  if (st === 'deposit_paid' || st === 'confirmed') return <>{helmet}<SuccessView reservation={reservation} /></>
  if (st === 'payment_conflict') return <>{helmet}<ConflictView reservation={reservation} /></>
  if (st === 'refunded') return <>{helmet}<RefundedView /></>
  if (st === 'cancelled' || st === 'expired') return <>{helmet}<FailureView cancelled /></>
  if (st === 'pending_payment') {
    if (shouldPoll) return <>{helmet}<VerifyingView /></>
    if (paidLikeUrl && timedOut) return <>{helmet}<PendingView slow /></>
    if (urlStatus === 'pending' || urlStatus === 'in_process') return <>{helmet}<PendingView /></>
    return <>{helmet}<FailureView /></>
  }
  return <>{helmet}<PendingView /></>
}

function Shell({ children }) {
  return (
    <div className="app-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem' }}>
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
        {children}
      </div>
      <WhatsAppButton variant="float" />
    </div>
  )
}

function Icon({ kind }) {
  const map = {
    ok: { bg: 'rgba(76,175,80,0.12)', border: 'rgba(76,175,80,0.3)', stroke: '#81c784', path: <path d="M20 6L9 17l-5-5" /> },
    wait: { bg: 'rgba(66,165,245,0.1)', border: 'rgba(66,165,245,0.25)', stroke: '#90caf9', path: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></> },
    error: { bg: 'rgba(224,85,85,0.1)', border: 'rgba(224,85,85,0.25)', stroke: '#ef9a9a', path: <path d="M18 6L6 18M6 6l12 12" /> },
    warn: { bg: 'rgba(200,144,10,0.12)', border: 'rgba(200,144,10,0.3)', stroke: '#f0b429', path: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></> },
  }
  const c = map[kind] || map.wait
  return (
    <div style={{ width: 80, height: 80, borderRadius: '50%', background: c.bg, border: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }} aria-hidden="true">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={c.stroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{c.path}</svg>
    </div>
  )
}

function ReservationCard({ reservation: r, badge }) {
  const slot = TIME_SLOTS[r.slot_type]?.label
  return (
    <div className="card card-gold" style={{ textAlign: 'left', marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--app-text)' }}>Detalle de la reserva</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.9rem' }}>
        <InfoRow label="Reserva" value={`#${String(r.id).slice(0, 8).toUpperCase()}`} />
        <InfoRow
          label="Fechas"
          value={r.start_date === r.end_date || !r.end_date
            ? formatDateEs(r.start_date)
            : `${formatDateEs(r.start_date)} → ${formatDateEs(r.end_date)}`}
        />
        {slot && <InfoRow label="Horario" value={slot} />}
        {r.event_type && <InfoRow label="Evento" value={r.event_type} />}
        {Number(r.deposit_amount) > 0 && <InfoRow label="Seña" value={formatARS(Number(r.deposit_amount))} />}
        {Number(r.balance_amount) > 0 && <InfoRow label="Saldo restante" value={formatARS(Number(r.balance_amount))} />}
        {Number(r.coupon_discount_pct) > 0 && <InfoRow label="Cupón aplicado" value={`-${r.coupon_discount_pct}% sobre la seña`} />}
        {badge && <InfoRow label="Estado" value={badge} />}
      </div>
    </div>
  )
}

function SuccessView({ reservation }) {
  const name = typeof reservation.first_name === 'string' && reservation.first_name.trim() ? reservation.first_name.trim() : ''
  return (
    <Shell>
      <Icon kind="ok" />
      <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', marginBottom: '0.75rem' }}>
        {name ? `¡Gracias, ${name}!` : '¡Reserva confirmada!'}
      </h1>
      <div className="gold-line" style={{ margin: '0 auto 1.5rem' }} />
      <p style={{ color: 'var(--app-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
        Tu seña fue acreditada. La fecha quedó bloqueada en nuestro calendario
        y en unos minutos vas a recibir un email con la confirmación.
      </p>
      <ReservationCard
        reservation={reservation}
        badge={<span className="badge badge-green">{reservation.status === 'confirmed' ? 'Confirmada' : 'Seña abonada'}</span>}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--app-muted)' }}>
          Recordá que el saldo restante se abona <strong>hasta 5 días antes</strong> del evento.
          Nos contactamos por email y WhatsApp para coordinar los detalles.
        </p>
        <Link to="/" className="btn btn-outline">Volver al inicio</Link>
      </div>
    </Shell>
  )
}

function VerifyingView() {
  return (
    <Shell>
      <Icon kind="wait" />
      <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', marginBottom: '0.75rem' }}>Confirmando tu pago…</h1>
      <p style={{ color: 'var(--app-muted)', lineHeight: 1.7, marginBottom: '1.5rem' }} role="status" aria-live="polite">
        Mercado Pago nos está avisando de tu pago. Esto suele demorar unos segundos; no cierres esta página.
      </p>
      <span className="spinner" style={{ margin: '0 auto' }} aria-hidden="true" />
    </Shell>
  )
}

function PendingView({ slow = false }) {
  return (
    <Shell>
      <Icon kind="wait" />
      <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', marginBottom: '0.75rem' }}>
        {slow ? 'Todavía no recibimos la confirmación' : 'Pago en proceso'}
      </h1>
      <p style={{ color: 'var(--app-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
        {slow
          ? 'Mercado Pago aún no nos confirmó la acreditación. Si pagaste, no hace falta que vuelvas a hacerlo: apenas se acredite te enviamos el email de confirmación. Si preferís, escribinos y lo verificamos.'
          : 'Tu pago está siendo procesado. Esto puede demorar algunos minutos. Te avisamos por email cuando se confirme.'}
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/" className="btn btn-ghost">Volver al inicio</Link>
        <WhatsAppButton variant="inline" message="Hola, hice una reserva y el pago quedó pendiente. ¿Me pueden confirmar?" />
      </div>
    </Shell>
  )
}

function FailureView({ cancelled = false }) {
  return (
    <Shell>
      <Icon kind="error" />
      <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.5rem)', marginBottom: '0.75rem' }}>
        {cancelled ? 'Esta reserva fue cancelada' : 'El pago no se completó'}
      </h1>
      <p style={{ color: 'var(--app-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
        {cancelled
          ? <>La reserva ya no está activa y la fecha <strong>no quedó bloqueada</strong>. Si querés, podés reservarla de nuevo.</>
          : <>Hubo un problema al procesar tu pago. La fecha <strong>no fue reservada</strong>. Podés intentarlo de nuevo o escribirnos.</>}
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/reservar" className="btn btn-gold">Intentar de nuevo</Link>
        <WhatsAppButton variant="inline" message="Hola, intenté hacer una reserva pero el pago falló. ¿Me pueden ayudar?" />
      </div>
    </Shell>
  )
}

function ConflictView({ reservation }) {
  return (
    <Shell>
      <Icon kind="warn" />
      <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', marginBottom: '0.75rem' }}>Recibimos tu pago, pero hay un detalle</h1>
      <p style={{ color: 'var(--app-muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
        El pago se acreditó pero no coincide con la reserva (por ejemplo, otra persona reservó la misma fecha
        segundos antes o el monto no es el esperado). <strong>No te preocupes:</strong> ya nos llegó el aviso,
        nos comunicamos con vos a la brevedad y, si no podemos resolverlo, te devolvemos la seña completa.
      </p>
      <ReservationCard reservation={reservation} badge={<span className="badge badge-gold">En revisión</span>} />
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <WhatsAppButton variant="inline" message={`Hola, pagué la seña de la reserva ${String(reservation.id).slice(0, 8).toUpperCase()} y el sitio me dice que está en revisión.`} />
        <Link to="/" className="btn btn-ghost">Volver al inicio</Link>
      </div>
    </Shell>
  )
}

function RefundedView() {
  return (
    <Shell>
      <Icon kind="warn" />
      <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', marginBottom: '0.75rem' }}>Esta seña fue devuelta</h1>
      <p style={{ color: 'var(--app-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
        La seña de esta reserva fue reembolsada y la fecha quedó liberada. Si querés volver a reservar, elegí una fecha nueva.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/reservar" className="btn btn-gold">Reservar otra fecha</Link>
        <WhatsAppButton variant="inline" message="Hola, tengo una consulta sobre una seña devuelta." />
      </div>
    </Shell>
  )
}

function ErrorView() {
  return (
    <Shell>
      <Icon kind="warn" />
      <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', marginBottom: '0.75rem' }}>No pudimos consultar tu reserva</h1>
      <p style={{ color: 'var(--app-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
        Hubo un problema de conexión. Si pagaste, la seña está a salvo: vas a recibir el email de confirmación en cuanto se acredite.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-outline" onClick={() => window.location.reload()}>Reintentar</button>
        <WhatsAppButton variant="inline" message="Hola, pagué una reserva y la página de confirmación no carga." />
      </div>
    </Shell>
  )
}

function NotFoundView() {
  return (
    <Shell>
      <Icon kind="error" />
      <h1 style={{ fontSize: 'clamp(1.6rem, 5vw, 2.2rem)', marginBottom: '0.75rem' }}>No encontramos esa reserva</h1>
      <p style={{ color: 'var(--app-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>
        El enlace no es válido o ya venció. Si hiciste una reserva, buscá el email de confirmación o escribinos.
      </p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link to="/reservar" className="btn btn-gold">Hacer una reserva</Link>
        <WhatsAppButton variant="inline" message="Hola, necesito ayuda con una reserva." />
      </div>
    </Shell>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
      <span style={{ color: 'var(--app-muted)' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right', color: 'var(--app-text)' }}>{value}</span>
    </div>
  )
}
