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

const WA_STATUS_MAP = {
  active:    { label: 'Activo',      badge: 'badge-blue' },
  qualified: { label: 'Calificado',  badge: 'badge-green' },
  closed:    { label: 'Cerrado',     badge: 'badge-gray' },
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [pwd, setPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [adminPwd, setAdminPwd] = useState('')
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [tab, setTab] = useState('reservations') // 'reservations' | 'blocked' | 'whatsapp'
  const [blockedDates, setBlockedDates] = useState([])
  const [newBlock, setNewBlock] = useState({ date: '', slot_type: 'full_day', reason: '' })

  // WhatsApp state
  const [waConversations, setWaConversations] = useState([])
  const [waLoading, setWaLoading] = useState(false)
  const [waFilter, setWaFilter] = useState('all')
  const [waSelected, setWaSelected] = useState(null)

  const handleLogin = async (e) => {
    e.preventDefault()
    setPwdError('')
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      })
      if (res.ok) {
        setAuthed(true)
        setAdminPwd(pwd)
      } else {
        setPwdError('Contraseña incorrecta')
      }
    } catch {
      setPwdError('Error de conexión. Intentá de nuevo.')
    }
  }

  useEffect(() => {
    if (!authed) return
    fetchReservations()
    fetchBlockedDates()
  }, [authed, filter])

  useEffect(() => {
    if (!authed || tab !== 'whatsapp') return
    fetchWaConversations()
  }, [authed, tab, waFilter])

  const fetchBlockedDates = async () => {
    const { data } = await supabase.from('blocked_dates').select('*').order('date')
    setBlockedDates(data || [])
  }

  const handleAddBlock = async (e) => {
    e.preventDefault()
    if (!newBlock.date) return
    const { error } = await supabase.from('blocked_dates').insert({
      date: newBlock.date,
      slot_type: newBlock.slot_type,
      reason: newBlock.reason || null,
    })
    if (error) { alert('Error: ' + error.message); return }
    setNewBlock({ date: '', slot_type: 'full_day', reason: '' })
    fetchBlockedDates()
  }

  const handleDeleteBlock = async (id) => {
    if (!confirm('¿Desbloquear esta fecha?')) return
    await supabase.from('blocked_dates').delete().eq('id', id)
    fetchBlockedDates()
  }

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

  const fetchWaConversations = async () => {
    setWaLoading(true)
    try {
      let query = supabase
        .from('whatsapp_conversations')
        .select('*')
        .order('updated_at', { ascending: false })
      if (waFilter !== 'all') query = query.eq('status', waFilter)
      const { data, error } = await query
      if (error) throw error
      setWaConversations(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setWaLoading(false)
    }
  }

  const handleCancel = async (id) => {
    if (!confirm('¿Cancelar esta reserva? Se liberará la fecha en el calendario. Esta acción no se puede deshacer.')) return
    try {
      const res = await fetch('/api/admin-cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, password: adminPwd }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        alert('Error: ' + (body.error || res.statusText))
        return
      }
      fetchReservations()
      setSelected(null)
    } catch (err) {
      alert('Error de conexión: ' + err.message)
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

  const waStats = {
    total: waConversations.length,
    qualified: waConversations.filter(c => c.status === 'qualified').length,
    closed: waConversations.filter(c => c.status === 'closed').length,
    active: waConversations.filter(c => c.status === 'active').length,
    totalMessages: waConversations.reduce((sum, c) => sum + (c.messages?.length || 0), 0),
    estimatedCost: waConversations.reduce((sum, c) => {
      const pairs = Math.ceil((c.messages?.length || 0) / 2)
      return sum + pairs * 0.002
    }, 0),
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
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          <button className={`btn btn-sm ${tab === 'reservations' ? 'btn-outline-app' : 'btn-ghost-app'}`} onClick={() => setTab('reservations')}>Reservas</button>
          <button className={`btn btn-sm ${tab === 'blocked' ? 'btn-outline-app' : 'btn-ghost-app'}`} onClick={() => setTab('blocked')}>Bloquear fechas</button>
          <button className={`btn btn-sm ${tab === 'whatsapp' ? 'btn-outline-app' : 'btn-ghost-app'}`} onClick={() => setTab('whatsapp')}>WhatsApp</button>
        </div>

        {/* Blocked dates tab */}
        {tab === 'blocked' && (
          <div style={{ maxWidth: 600 }}>
            <form onSubmit={handleAddBlock} className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Bloquear fecha</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input type="date" className="form-input" value={newBlock.date} onChange={e => setNewBlock(p => ({ ...p, date: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Jornada</label>
                  <select className="form-input" value={newBlock.slot_type} onChange={e => setNewBlock(p => ({ ...p, slot_type: e.target.value }))}>
                    <option value="full_day">Día completo</option>
                    <option value="half_day_morning">Mañana</option>
                    <option value="half_day_afternoon">Tarde/Noche</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Motivo (opcional)</label>
                <input type="text" className="form-input" placeholder="Ej: Evento privado" value={newBlock.reason} onChange={e => setNewBlock(p => ({ ...p, reason: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-gold">Bloquear fecha</button>
            </form>

            <div className="card">
              <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Fechas bloqueadas</h3>
              {blockedDates.length === 0 ? (
                <p style={{ color: 'var(--app-muted)', fontSize: '0.9rem' }}>No hay fechas bloqueadas manualmente</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {blockedDates.map(b => (
                    <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: 'var(--bg-card2)', borderRadius: 'var(--radius)', fontSize: '0.88rem' }}>
                      <div>
                        <span style={{ fontWeight: 600 }}>{b.date}</span>
                        <span style={{ color: 'var(--app-muted)', marginLeft: '0.75rem' }}>
                          {b.slot_type === 'full_day' ? 'Día completo' : b.slot_type === 'half_day_morning' ? 'Mañana' : 'Tarde/Noche'}
                        </span>
                        {b.reason && <span style={{ color: 'var(--app-dim)', marginLeft: '0.5rem' }}>· {b.reason}</span>}
                      </div>
                      <button onClick={() => handleDeleteBlock(b.id)} style={{ background: 'none', border: 'none', color: '#ef9a9a', cursor: 'pointer', fontSize: '0.85rem' }}>Desbloquear</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reservations tab */}
        {tab === 'reservations' && (<>
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
      </>)}

        {/* WhatsApp tab */}
        {tab === 'whatsapp' && (<>
          {/* WA Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <StatCard label="Conversaciones" value={waStats.total} />
            <StatCard label="Calificados" value={waStats.qualified} accent />
            <StatCard label="Activos" value={waStats.active} />
            <StatCard label="Cerrados" value={waStats.closed} />
            <StatCard label="Mensajes totales" value={waStats.totalMessages} />
            <StatCard label="Costo estimado" value={`$${waStats.estimatedCost.toFixed(3)} USD`} accent />
          </div>

          {/* WA Filters */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { value: 'all', label: 'Todos' },
              { value: 'qualified', label: 'Calificados' },
              { value: 'active', label: 'Activos' },
              { value: 'closed', label: 'Cerrados' },
            ].map(f => (
              <button
                key={f.value}
                className={`btn btn-sm ${waFilter === f.value ? 'btn-outline-app' : 'btn-ghost-app'}`}
                onClick={() => setWaFilter(f.value)}
              >
                {f.label}
              </button>
            ))}
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto' }} onClick={fetchWaConversations}>
              ↻ Actualizar
            </button>
          </div>

          {/* WA Table */}
          {waLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--app-muted)' }}>
              <span className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : waConversations.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--app-muted)' }}>
              No hay conversaciones con este filtro
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #222' }}>
                    {['Último mensaje', 'Teléfono', 'Nombre', 'Tipo evento', 'Fecha evento', 'Estado', 'Msgs', ''].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', color: 'var(--app-muted)', fontWeight: 500, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {waConversations.map(c => {
                    const s = WA_STATUS_MAP[c.status] || { label: c.status, badge: 'badge-gray' }
                    const lead = c.lead_data || {}
                    const phone = (c.phone || '').replace('whatsapp:', '')
                    return (
                      <tr
                        key={c.phone}
                        style={{ borderBottom: '1px solid #1a1a1a', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#111'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => setWaSelected(c)}
                      >
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--app-muted)', whiteSpace: 'nowrap' }}>
                          {c.updated_at ? format(parseISO(c.updated_at), 'd MMM HH:mm', { locale: es }) : '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--app-muted)' }}>
                          {phone}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 500 }}>
                          {lead.nombre || <span style={{ color: 'var(--app-dim)' }}>—</span>}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--app-muted)' }}>
                          {lead.tipo || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--app-muted)', whiteSpace: 'nowrap' }}>
                          {lead.fecha || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span className={`badge ${s.badge}`}>{s.label}</span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--app-muted)', textAlign: 'center' }}>
                          {c.messages?.length || 0}
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
        </>)}
      </div>

      {/* Reservation detail modal */}
      {selected && (
        <ReservationModal
          reservation={selected}
          onClose={() => setSelected(null)}
          onCancel={handleCancel}
        />
      )}

      {/* WhatsApp conversation modal */}
      {waSelected && (
        <WaConversationModal
          conversation={waSelected}
          onClose={() => setWaSelected(null)}
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

function WaConversationModal({ conversation: c, onClose }) {
  const s = WA_STATUS_MAP[c.status] || { label: c.status, badge: 'badge-gray' }
  const lead = c.lead_data || {}
  const messages = Array.isArray(c.messages) ? c.messages : []
  const phone = (c.phone || '').replace('whatsapp:', '')
  const pairs = Math.ceil(messages.length / 2)
  const estimatedCost = (pairs * 0.002).toFixed(3)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
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
        style={{ maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem' }}>Conversación WhatsApp</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--app-dim)', marginTop: '0.2rem', fontFamily: 'monospace' }}>{phone}</p>
          </div>
          <button className="btn btn-ghost-app btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* Lead data */}
        {Object.keys(lead).length > 0 && (
          <Section title="Datos del lead">
            {lead.nombre   && <InfoRow label="Nombre"   value={lead.nombre} />}
            {lead.empresa  && <InfoRow label="Empresa"  value={lead.empresa} />}
            {lead.email    && <InfoRow label="Email"    value={lead.email} />}
            {lead.fecha    && <InfoRow label="Fecha"    value={lead.fecha} />}
            {lead.personas && <InfoRow label="Personas" value={lead.personas} />}
            {lead.tipo     && <InfoRow label="Tipo"     value={lead.tipo} />}
            {lead.duracion && <InfoRow label="Duración" value={lead.duracion} />}
            {lead.urgencia && <InfoRow label="Urgencia" value={lead.urgencia} />}
            {lead.notas    && <InfoRow label="Notas"    value={lead.notas} />}
          </Section>
        )}

        {/* Meta */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--app-muted)' }}>
          <span>Estado: <span className={`badge ${s.badge}`} style={{ fontSize: '0.75rem' }}>{s.label}</span></span>
          <span>· {messages.length} mensajes</span>
          <span>· Costo estimado: <span style={{ color: 'var(--gold)' }}>${estimatedCost} USD</span></span>
          {c.updated_at && <span>· Último: {format(parseISO(c.updated_at), "d MMM yyyy HH:mm", { locale: es })}</span>}
        </div>

        {/* Transcript */}
        <div>
          <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gold)', marginBottom: '0.75rem', fontWeight: 600 }}>Conversación</p>
          {messages.length === 0 ? (
            <p style={{ color: 'var(--app-muted)', fontSize: '0.88rem' }}>Sin mensajes registrados</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    justifyContent: msg.role === 'user' ? 'flex-start' : 'flex-end',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '80%',
                      padding: '0.6rem 0.85rem',
                      borderRadius: msg.role === 'user' ? '0.75rem 0.75rem 0.75rem 0.2rem' : '0.75rem 0.75rem 0.2rem 0.75rem',
                      background: msg.role === 'user' ? 'var(--bg-card2)' : 'rgba(193,156,97,0.12)',
                      border: msg.role === 'user' ? '1px solid #222' : '1px solid rgba(193,156,97,0.2)',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    <span style={{ fontSize: '0.7rem', color: 'var(--app-dim)', display: 'block', marginBottom: '0.25rem' }}>
                      {msg.role === 'user' ? 'Lead' : 'Agente'}
                    </span>
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
