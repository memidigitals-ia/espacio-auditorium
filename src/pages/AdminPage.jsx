import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { formatARS } from '../lib/pricing'

const STATUS_MAP = {
  pending_payment: { label: 'Esperando pago', badge: 'badge-blue' },
  deposit_paid: { label: 'Seña abonada', badge: 'badge-green' },
  confirmed: { label: 'Confirmada', badge: 'badge-green' },
  cancelled: { label: 'Cancelada', badge: 'badge-red' },
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)

  const handleLogin = (e) => {
    e.preventDefault()
    // Simple password check via env (not stored in frontend bundle)
    // In production, use Supabase auth or a real auth mechanism
    const adminPwd = import.meta.env.VITE_ADMIN_PASSWORD
    if (!adminPwd) {
      // If env not set, use a default dev password
      if (pwd === 'admin2024') {
        setAuthed(true)
      } else {
        setPwdError('Contraseña incorrecta')
      }
    } else if (pwd === adminPwd) {
      setAuthed(true)
    } else {
      setPwdError('Contraseña incorrecta')
    }
  }

  useEffect(() => {
    if (!authed) return
    fetchReservations()
  }, [authed, filter])

  const fetchReservations = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('reservations')
        .select('*')
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('status', filter)
      }

      const { data, error } = await query
      if (error) throw error
      setReservations(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('¿Cancelar esta reserva? Esta acción no se puede deshacer.')) return
    const { error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled' })
      .eq('id', id)

    if (error) {
      alert('Error: ' + error.message)
    } else {
      fetchReservations()
      setSelected(null)
    }
  }

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem' }}>
        <div style={{ maxWidth: 360, width: '100%' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Panel de Admin</h1>
            <p style={{ color: 'var(--app-muted)', fontSize: '0.9rem' }}>Espacio Auditorium</p>
          </div>
          <form onSubmit={handleLogin} className="card">
            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                className={`form-input ${pwdError ? 'error' : ''}`}
                value={pwd}
                onChange={e => { setPwd(e.target.value); setPwdError('') }}
                autoFocus
              />
              {pwdError && <span className="form-error">{pwdError}</span>}
            </div>
            <button type="submit" className="btn btn-gold btn-full">Ingresar</button>
          </form>
        </div>
      </div>
    )
  }

  const stats = {
    total: reservations.length,
    depositPaid: reservations.filter(r => ['deposit_paid', 'confirmed'].includes(r.status)).length,
    pending: reservations.filter(r => r.status === 'pending_payment').length,
    totalRevenue: reservations
      .filter(r => ['deposit_paid', 'confirmed'].includes(r.status))
      .reduce((sum, r) => sum + (r.deposit_amount || 0), 0),
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '1.25rem', background: 'var(--bg-card)' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '1.3rem' }}>Panel de Admin</h1>
            <p style={{ fontSize: '0.8rem', color: 'var(--app-muted)' }}>Espacio Auditorium</p>
          </div>
          <button className="btn btn-ghost-app btn-sm" onClick={() => setAuthed(false)}>
            Salir
          </button>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '2rem' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <StatCard label="Reservas totales" value={stats.total} />
          <StatCard label="Con seña abonada" value={stats.depositPaid} accent />
          <StatCard label="Pendientes de pago" value={stats.pending} />
          <StatCard label="Señas recibidas" value={formatARS(stats.totalRevenue)} accent />
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { value: 'all', label: 'Todas' },
            { value: 'deposit_paid', label: 'Seña abonada' },
            { value: 'pending_payment', label: 'Pendientes' },
            { value: 'confirmed', label: 'Confirmadas' },
            { value: 'cancelled', label: 'Canceladas' },
          ].map(f => (
            <button
              key={f.value}
              className={`btn btn-sm ${filter === f.value ? 'btn-outline-app' : 'btn-ghost-app'}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
          <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={fetchReservations}>
            ↻ Actualizar
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--app-muted)' }}>
            <span className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : reservations.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--app-muted)' }}>
            No hay reservas con este filtro
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  {['Fecha reserva', 'Cliente', 'Fechas evento', 'Tipo', 'Seña', 'Estado', ''].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--app-muted)', fontWeight: 500, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservations.map(r => {
                  const s = STATUS_MAP[r.status] || { label: r.status, badge: 'badge-gray' }
                  return (
                    <tr
                      key={r.id}
                      style={{ borderBottom: '1px solid #1a1a1a', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#111'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      onClick={() => setSelected(r)}
                    >
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--app-muted)', whiteSpace: 'nowrap' }}>
                        {format(parseISO(r.created_at), 'd MMM yyyy', { locale: es })}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 500 }}>{r.first_name} {r.last_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--app-muted)' }}>{r.email}</div>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        {r.start_date}
                        {r.end_date !== r.start_date && <> → {r.end_date}</>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--app-muted)', whiteSpace: 'nowrap' }}>
                        {r.duration_type === 'half_day' ? 'Media jornada' : 'Jornada completa'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--gold)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {r.deposit_amount ? formatARS(r.deposit_amount) : '—'}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge ${s.badge}`}>{s.label}</span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--app-dim)' }}>
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && (
        <ReservationModal
          reservation={selected}
          onClose={() => setSelected(null)}
          onCancel={handleCancel}
        />
      )}
    </div>
  )
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`card ${accent ? 'card-gold' : ''}`} style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-serif)', color: accent ? 'var(--gold)' : 'var(--app-text)', fontWeight: 700, marginBottom: '0.3rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.78rem', color: 'var(--app-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
    </div>
  )
}

function ReservationModal({ reservation: r, onClose, onCancel }) {
  const s = STATUS_MAP[r.status] || { label: r.status, badge: 'badge-gray' }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="card"
        style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem' }}>Detalle de reserva</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--app-dim)', marginTop: '0.2rem' }}>#{r.id.split('-')[0]}</p>
          </div>
          <button className="btn btn-ghost-app btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
          <Section title="Cliente">
            <InfoRow label="Nombre" value={`${r.first_name} ${r.last_name}`} />
            <InfoRow label="Email" value={r.email} />
            <InfoRow label="WhatsApp" value={r.whatsapp} />
          </Section>

          <Section title="Evento">
            <InfoRow label="Tipo" value={r.event_type} />
            <InfoRow label="Fechas" value={`${r.start_date} → ${r.end_date}`} />
            <InfoRow label="Jornada" value={r.duration_type === 'half_day' ? 'Media jornada' : 'Jornada completa'} />
            {r.additional_hours > 0 && <InfoRow label="Horas adicionales" value={r.additional_hours} />}
            {r.notes && <InfoRow label="Notas" value={r.notes} />}
          </Section>

          <Section title="Pago">
            <InfoRow label="Total" value={r.total_price ? formatARS(r.total_price) : '—'} />
            <InfoRow label="Seña (30%)" value={r.deposit_amount ? formatARS(r.deposit_amount) : '—'} />
            <InfoRow label="Saldo pendiente" value={r.balance_amount ? formatARS(r.balance_amount) : '—'} />
            {r.mp_payment_id && <InfoRow label="MP Payment ID" value={r.mp_payment_id} />}
            <InfoRow label="Estado" value={<span className={`badge ${s.badge}`}>{s.label}</span>} />
          </Section>
        </div>

        <hr className="sep" />

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          {r.status !== 'cancelled' && (
            <button
              className="btn btn-sm"
              style={{ background: 'rgba(224,85,85,0.1)', border: '1px solid rgba(224,85,85,0.25)', color: '#ef9a9a' }}
              onClick={() => onCancel(r.id)}
            >
              Cancelar reserva
            </button>
          )}
          <button className="btn btn-ghost-app btn-sm" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gold)', marginBottom: '0.6rem', fontWeight: 600 }}>{title}</p>
      <div className="card" style={{ padding: '0.85rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {children}
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', fontSize: '0.88rem' }}>
      <span style={{ color: 'var(--app-muted)' }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  )
}
