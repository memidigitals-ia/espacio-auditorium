import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { calculatePrice, formatARS } from '../lib/pricing'

const PRICES = { 4: 520000, 8: 780000, EXTRA_HOUR: 130000, DISCOUNT: 0.15 }

const DURATION_OPTIONS = [
  { value: '4',    label: 'Media jornada — 4 horas' },
  { value: '8',    label: 'Jornada completa — 8 horas' },
  { value: 'extra4', label: 'Jornada + 4 hs adicionales' },
  { value: 'dias2', label: '2 días completos' },
  { value: 'dias3', label: '3 días completos' },
  { value: 'dias4', label: '4 días completos 🔥 -15%' },
]

const HORARIOS = [
  { value: '8', label: '8:00 AM' }, { value: '9', label: '9:00 AM' },
  { value: '10', label: '10:00 AM' }, { value: '11', label: '11:00 AM' },
  { value: '12', label: '12:00 PM' }, { value: '13', label: '1:00 PM' },
  { value: '14', label: '2:00 PM' }, { value: '15', label: '3:00 PM' },
  { value: '16', label: '4:00 PM' }, { value: '17', label: '5:00 PM' },
]

const FAQS = [
  { q: '¿El precio es por sala o por el espacio completo?', a: 'El precio es por el <strong>espacio completo</strong> — no pagás por sala. Al reservar tenés acceso a las tres salas (Gaudi, Pollock y Miro) durante el tiempo contratado.' },
  { q: '¿Cómo reservo una fecha?', a: 'Usás el cotizador de esta misma página: elegís fecha, duración y horario, ves el precio al instante y completás el formulario. Con el <strong>30% de seña</strong> la fecha queda bloqueada y el precio congelado.' },
  { q: '¿Cómo se paga la seña?', a: 'La seña (30%) se abona por <strong>Mercado Pago</strong> (tarjeta, transferencia, débito). El saldo restante (70%) se abona hasta <strong>5 días antes</strong> del evento.' },
  { q: '¿Qué incluye el espacio?', a: '<strong>Sala Gaudi</strong>: proyector HDMI y rotafolio, 36 personas. <strong>Sala Pollock</strong>: TV 42" HDMI, 12 personas. <strong>Sala Miro</strong>: TV 42" HDMI y rotafolio, 15 personas. WiFi 100MB y aire acondicionado incluidos.' },
  { q: '¿Se puede hacer streaming o grabar video?', a: 'Sí. El espacio ya fue usado para <strong>streamings en vivo y grabaciones</strong>. La acústica e iluminación de la Sala Gaudi son ideales para producción de contenido.' },
  { q: '¿Hay descuentos por varios días?', a: 'Sí. Contratando <strong>4 días o más</strong> accedés a un <strong>15% de descuento</strong> automático. Podés calcularlo en el cotizador.' },
  { q: '¿Dónde está ubicado?', a: '<strong>Marcelo T. de Alvear 2153, 2° Piso, Recoleta, CABA.</strong> Frente a la Facultad de Odontología UBA, a dos cuadras de Medicina. Subte línea D y múltiples colectivos.' },
  { q: '¿Puedo visitar el espacio antes de reservar?', a: 'Podés hacer el <strong>recorrido virtual 360°</strong> desde esta misma página. Si querés una visita presencial, escribinos por WhatsApp y coordinamos.' },
]

function calcCotizacion(duracion) {
  if (!duracion) return null
  let precio = 0, lineas = [], descuento = false
  if (duracion === 'extra4') {
    precio = PRICES[8] + (4 * PRICES.EXTRA_HOUR)
    lineas = [{ label: 'Jornada completa (8 hs)', valor: PRICES[8] }, { label: '4 horas adicionales', valor: 4 * PRICES.EXTRA_HOUR }]
  } else if (duracion === 'dias2') {
    precio = PRICES[8] * 2
    lineas = [{ label: '2 jornadas completas', valor: PRICES[8] * 2 }]
  } else if (duracion === 'dias3') {
    precio = PRICES[8] * 3
    lineas = [{ label: '3 jornadas completas', valor: PRICES[8] * 3 }]
  } else if (duracion === 'dias4') {
    precio = PRICES[8] * 4 * (1 - PRICES.DISCOUNT); descuento = true
    lineas = [{ label: '4 jornadas completas', valor: PRICES[8] * 4 }, { label: 'Descuento 15%', valor: -(PRICES[8] * 4 * PRICES.DISCOUNT) }]
  } else {
    precio = PRICES[parseInt(duracion)]
    lineas = [{ label: duracion === '4' ? 'Media jornada (4 horas)' : 'Jornada completa (8 horas)', valor: precio }]
  }
  return { precio, sena: precio * 0.3, lineas, descuento }
}

export default function HomePage() {
  const navigate = useNavigate()
  const [fecha, setFecha] = useState('')
  const [duracion, setDuracion] = useState('')
  const [horario, setHorario] = useState('')
  const [cotizacion, setCotizacion] = useState(null)

  const handleCotizar = (newFecha, newDuracion) => {
    const f = newFecha !== undefined ? newFecha : fecha
    const d = newDuracion !== undefined ? newDuracion : duracion
    if (f && d) setCotizacion(calcCotizacion(d))
    else setCotizacion(null)
  }

  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      {/* NAV */}
      <nav className="site-nav" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '24px 48px',
        background: 'rgba(250,248,245,0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <a href="/" style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, letterSpacing: '0.02em', color: 'var(--black)', textDecoration: 'none' }}>
          Espacio <span style={{ color: 'var(--gold)' }}>Auditorium</span>
        </a>
        <button
          onClick={() => navigate('/reservar')}
          style={{ background: 'var(--black)', color: 'white', padding: '10px 24px', borderRadius: 2, fontSize: 13, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', border: 'none', cursor: 'pointer', transition: 'background 0.2s, color 0.2s', fontFamily: 'var(--font-sans)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = 'var(--black)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--black)'; e.currentTarget.style.color = 'white' }}
        >
          Reservar fecha
        </button>
      </nav>

      {/* HERO */}
      <section className="hero-grid" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', paddingTop: 80 }}>
        <div className="hero-text" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 64px 80px 80px' }}>
          <span className="anim-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 32 }}>
            <span style={{ display: 'block', width: 32, height: 1, background: 'var(--gold)' }} />
            Recoleta · Buenos Aires
          </span>

          <h1 className="anim-2" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(44px, 5vw, 68px)', fontWeight: 400, lineHeight: 1.1, color: 'var(--black)', marginBottom: 28, letterSpacing: '-0.01em' }}>
            Tu evento<br />en <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>primera<br />fila.</em>
          </h1>

          <p className="anim-3" style={{ fontSize: 16, fontWeight: 300, color: '#555', lineHeight: 1.7, maxWidth: 420, marginBottom: 48 }}>
            Un espacio boutique para conferencias, streamings, lanzamientos y workshops. En el corazón de Recoleta, con todo lo que necesitás.
          </p>

          <div className="anim-4" style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <a href="#cotizar" className="btn-primary">Ver disponibilidad y precios</a>
            <a href="#tour" className="btn-ghost-landing">Recorrido virtual →</a>
          </div>

          <div className="anim-5" style={{ display: 'flex', gap: 40, marginTop: 64, paddingTop: 40, borderTop: '1px solid var(--gray-light)' }}>
            {[['4.9', 'Google Reviews'], ['36', 'Capacidad máx.'], ['3', 'Salas disponibles']].map(([num, label]) => (
              <div key={label}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 400, color: 'var(--black)', display: 'block', lineHeight: 1, marginBottom: 6 }}>{num}</span>
                <span style={{ fontSize: 12, color: 'var(--gray)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'relative', overflow: 'hidden', background: 'var(--black)' }}
          onMouseEnter={e => e.currentTarget.querySelector('img').style.transform = 'scale(1.03)'}
          onMouseLeave={e => e.currentTarget.querySelector('img').style.transform = 'scale(1)'}
        >
          <img
            src="/salagaudi.jpg"
            alt="Sala Gaudi - Espacio Auditorium"
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85, display: 'block', transition: 'transform 8s ease' }}
          />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 48, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)', color: 'white' }}>
            <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold-light)', marginBottom: 12, display: 'block' }}>Sala Gaudi · Auditorio principal</span>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 28, fontWeight: 400 }}>Formato auditorio · 36 personas · Proyector HDMI</p>
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="usecases-section" style={{ background: 'var(--black)', padding: '100px 80px' }}>
        <span className="section-tag" style={{ color: 'var(--gold)' }}>Para qué lo usás</span>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 400, color: 'white', lineHeight: 1.15, marginBottom: 20 }}>
          El espacio se adapta<br />a tu formato.
        </h2>
        <p style={{ fontSize: 16, color: '#aaa', fontWeight: 300, marginBottom: 60 }}>Alquilás el espacio completo. Elegís cómo usarlo.</p>

        <div className="usecases-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {[
            { icon: '🎙️', title: 'Charlas y Conferencias', desc: 'Butacas rojas, proyector, micrófono. El formato que te hace quedar bien frente a tu audiencia.' },
            { icon: '📡', title: 'Streaming y Grabación', desc: 'Ya se usó para streamings en vivo. Acústica, iluminación y conectividad para producir contenido profesional.' },
            { icon: '🚀', title: 'Lanzamientos', desc: 'Presentá tu producto, programa o servicio en un espacio que transmite profesionalismo desde que entrás.' },
            { icon: '🎓', title: 'Workshops y Capacitaciones', desc: 'Disposición flexible, TV HDMI, rotafolio. Para formaciones donde el aprendizaje necesita espacio.' },
            { icon: '🎤', title: 'Podcast y Contenido', desc: 'Un set que ya se usó para producciones en vivo. Grabá tu podcast en un espacio con onda.' },
            { icon: '🤝', title: 'Reuniones y Networking', desc: 'Para encuentros de equipos, mesas redondas o eventos de networking con un toque distinto.' },
          ].map((c) => (
            <CaseItem key={c.title} {...c} />
          ))}
        </div>
      </section>

      {/* TOUR VIRTUAL */}
      <div id="tour" className="tour-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 600 }}>
        <div style={{ padding: '100px 64px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--off-white)' }}>
          <span className="section-tag">Conocé el espacio</span>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.15, marginBottom: 20 }}>
            Recorrelo antes<br />de reservar.
          </h2>
          <p style={{ fontSize: 16, color: '#666', fontWeight: 300, lineHeight: 1.7, marginBottom: 32 }}>
            Tres salas, un piso completo. Navegá el recorrido virtual 360° y conocé cada rincón del espacio antes de dar el paso.
          </p>
          <a href="https://my.matterport.com/show/?m=9JaMUZrVdZC" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-block', width: 'fit-content' }}>
            Abrir tour en pantalla completa →
          </a>
        </div>
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 500 }}>
          <iframe
            src="https://my.matterport.com/show/?m=9JaMUZrVdZC"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none', display: 'block' }}
            allowFullScreen
            allow="vr"
            loading="lazy"
            title="Tour virtual Espacio Auditorium"
          />
        </div>
      </div>

      {/* COTIZADOR */}
      <section id="cotizar" style={{ background: 'var(--warm-white)', padding: '100px 80px' }}>
        <div className="cotizador-header" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, marginBottom: 64, alignItems: 'end' }}>
          <div>
            <span className="section-tag">Cotizador instantáneo</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.15 }}>
              Precio en<br />segundos.
            </h2>
          </div>
          <p style={{ fontSize: 16, color: '#666', fontWeight: 300, lineHeight: 1.7 }}>
            Sin esperar. Elegís la fecha y la duración, y el precio aparece al instante. Después reservás con el 30% de seña vía Mercado Pago.
          </p>
        </div>

        <div style={{ background: '#fff8e1', borderLeft: '3px solid var(--gold)', padding: '14px 20px', borderRadius: 2, marginBottom: 24, fontSize: 13, color: '#5a4000' }}>
          <strong>Importante:</strong> Se reservan 30 minutos antes y 30 minutos después de tu evento para limpieza y preparación del espacio.
        </div>

        <div className="cotizador-box" style={{ background: 'white', border: '1px solid var(--gray-light)', padding: 48, borderRadius: 4 }}>
          <div className="cotizador-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <FormGroup label="Fecha del evento">
              <input
                type="date"
                min={today}
                value={fecha}
                onChange={e => { setFecha(e.target.value); handleCotizar(e.target.value, undefined) }}
                style={inputStyle}
              />
            </FormGroup>
            <FormGroup label="Duración">
              <select value={duracion} onChange={e => { setDuracion(e.target.value); handleCotizar(undefined, e.target.value) }} style={inputStyle}>
                <option value="">— Elegí —</option>
                {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Horario de inicio">
              <select value={horario} onChange={e => setHorario(e.target.value)} style={inputStyle}>
                <option value="">— Elegí —</option>
                {HORARIOS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Cantidad de personas (aprox.)">
              <select style={inputStyle} defaultValue="">
                <option value="">— Elegí —</option>
                <option value="10">Hasta 10 personas</option>
                <option value="20">Hasta 20 personas</option>
                <option value="36">Hasta 36 personas</option>
              </select>
            </FormGroup>
          </div>

          {cotizacion && (
            <div className="cotizador-result" style={{ background: 'var(--black)', borderRadius: 4, padding: '36px 40px', marginTop: 24 }}>
              <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16, display: 'block' }}>Tu cotización</span>

              {cotizacion.descuento && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--gold)', color: 'var(--black)', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '4px 12px', borderRadius: 1, marginBottom: 16 }}>
                  🔥 15% OFF incluido
                </span>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #222' }}>
                {cotizacion.lineas.map((l, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: l.valor < 0 ? '#4CAF50' : '#aaa' }}>
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
                <span style={{ fontSize: 13, color: '#666' }}>+ IVA (21%) · Precio por el espacio completo</span>
              </div>

              <div style={{ background: '#111', borderRadius: 2, padding: '16px 20px', marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block' }}>Seña para reservar (30%)</span>
                  <span style={{ fontSize: 11, color: '#666' }}>Congela precio y fecha</span>
                </div>
                <span style={{ fontSize: 20, fontWeight: 500, color: 'var(--gold)', fontFamily: 'var(--font-serif)' }}>{formatARS(cotizacion.sena)}</span>
              </div>

              <button
                className="btn-primary"
                style={{ width: '100%', marginTop: 24, padding: 18, fontSize: 13, letterSpacing: '0.12em', borderRadius: 2 }}
                onClick={() => {
                  const params = new URLSearchParams()
                  if (fecha) params.set('from', fecha)
                  // Map duracion to durationType
                  if (duracion === '4') {
                    params.set('duration', 'half_day')
                    params.set('slot', parseInt(horario) >= 13 ? 'half_day_afternoon' : 'half_day_morning')
                  } else if (duracion === 'extra4') {
                    params.set('duration', 'full_day')
                    params.set('hours', '4')
                  } else if (duracion === 'dias2') {
                    params.set('duration', 'full_day')
                    params.set('days', '2')
                  } else if (duracion === 'dias3') {
                    params.set('duration', 'full_day')
                    params.set('days', '3')
                  } else if (duracion === 'dias4') {
                    params.set('duration', 'full_day')
                    params.set('days', '4')
                  } else {
                    params.set('duration', 'full_day')
                  }
                  navigate(`/reservar?${params.toString()}`)
                }}
              >
                Reservar esta fecha →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CONDICIONES */}
      <div className="conditions-grid" style={{ background: 'var(--off-white)', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        {[
          { num: '30%', title: 'Seña para bloquear', desc: 'Con el 30% del total reservás la fecha y el precio queda congelado. Nadie más puede reservar ese día.' },
          { num: '-5d', title: 'Saldo antes del evento', desc: 'El 70% restante se abona hasta 5 días antes del evento. Sin sorpresas ni costos adicionales.' },
          { num: '-15%', title: 'Descuento por 4+ días', desc: 'Si contratás 4 días o más, accedés al 15% de descuento automáticamente sobre el total.' },
        ].map((c) => (
          <CondItem key={c.num} {...c} />
        ))}
      </div>

      {/* REVIEWS */}
      <section style={{ background: 'var(--black)', color: 'white', padding: '100px 80px' }}>
        <span className="section-tag" style={{ color: 'var(--gold)' }}>Lo que dicen los que estuvieron</span>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 400, color: 'white', lineHeight: 1.15, marginBottom: 60 }}>
          4.9 en Google.<br />Sin palabras.
        </h2>
        <div className="reviews-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { author: 'Pablo González', text: 'Las salas son increíbles, espacios súper útiles, la atención que nos brindaron impecable. Todo súper limpio y acorde. Volveremos a elegir el espacio para más eventos.' },
            { author: 'Mati Du', text: 'El espacio está impecable. De los mejores auditorios de CABA. La atención de Sebastián y equipo, 10 puntos. Gracias por todo.' },
            { author: 'Santiago Rodríguez', text: 'Excelente espacio para dar conferencias, muy nuevo y lindo todo. La atención para cerrar la fecha como también para el evento fue muy buena.' },
          ].map((r) => (
            <div key={r.author} style={{ background: '#111', border: '1px solid #1e1e1e', padding: 36, borderRadius: 4 }}>
              <span style={{ color: 'var(--gold)', fontSize: 14, letterSpacing: 2, marginBottom: 20, display: 'block' }}>★★★★★</span>
              <p style={{ fontSize: 15, color: '#ccc', lineHeight: 1.7, fontWeight: 300, fontStyle: 'italic', marginBottom: 24 }}>"{r.text}"</p>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#888', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.author}</span>
            </div>
          ))}
        </div>
      </section>

      {/* UBICACIÓN */}
      <div className="location-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ padding: '100px 80px', display: 'flex', flexDirection: 'column', justifyContent: 'center', background: 'var(--warm-white)' }}>
          <span className="section-tag">Dónde estamos</span>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.15, marginBottom: 20 }}>
            En el corazón<br />de Recoleta.
          </h2>
          <p style={{ fontSize: 16, color: '#666', fontWeight: 300, lineHeight: 1.7 }}>
            Frente a la Facultad de Odontología de la UBA, a dos cuadras de Medicina. Fácil acceso en subte y colectivo.
          </p>

          <a href="https://maps.app.goo.gl/5yXfCeKArFk4hwYv8" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', margin: '28px 0' }}>
            <div
              style={{ background: 'var(--black)', borderRadius: 4, padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 20, transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#1a1a1a'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--black)'}
            >
              <span style={{ fontSize: 32, flexShrink: 0 }}>📍</span>
              <div>
                <p style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'white', fontWeight: 400, marginBottom: 4, lineHeight: 1.2 }}>Marcelo T. de Alvear 2153</p>
                <p style={{ fontSize: 14, color: 'var(--gold)', fontWeight: 500, letterSpacing: '0.06em', marginBottom: 4 }}>2° Piso · Recoleta · CABA</p>
                <p style={{ fontSize: 12, color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Ver en Google Maps →</p>
              </div>
            </div>
          </a>

          {[
            { icon: '🚇', title: 'Subte línea D', sub: 'Estación Pueyrredón o Facultad de Medicina' },
            { icon: '🚌', title: 'Múltiples líneas de colectivo', sub: 'Av. Santa Fe y Av. Pueyrredón' },
            { icon: '🅿️', title: 'Estacionamiento', sub: 'Múltiples cocheras a metros del espacio' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginTop: 28, paddingTop: 28, borderTop: i === 0 ? '1px solid var(--gray-light)' : 'none' }}>
              <div style={{ width: 40, height: 40, background: 'var(--black)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{item.icon}</div>
              <div>
                <strong style={{ display: 'block', fontSize: 15, fontWeight: 500, marginBottom: 4 }}>{item.title}</strong>
                <span style={{ fontSize: 14, color: '#777', fontWeight: 300 }}>{item.sub}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ position: 'relative', minHeight: 500, background: 'var(--gray-light)' }}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d963.8!2d-58.3934!3d-34.5954!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcca97ee0a54f3%3A0x6b7b2a5481539919!2sMarcelo%20T.%20de%20Alvear%202153%2C%20C1122%20CABA!5e0!3m2!1ses!2sar!4v1710000000001!5m2!1ses!2sar"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, display: 'block' }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Ubicación Espacio Auditorium"
          />
        </div>
      </div>

      {/* FAQ */}
      <section style={{ background: 'var(--warm-white)', padding: '100px 80px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <span className="section-tag">Preguntas frecuentes</span>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.15, marginBottom: 48 }}>
            Todo lo que<br />necesitás saber.
          </h2>
          <FAQList />
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="reservar" style={{ background: 'var(--gold)', padding: '100px 80px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 400, color: 'var(--black)', marginBottom: 24 }}>
          ¿Tu fecha está<br />disponible?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.6)', fontWeight: 300, maxWidth: 480, margin: '0 auto 48px' }}>
          Cotizá en segundos y reservá con el 30% de seña. Sin llamadas, sin esperar respuesta.
        </p>
        <button
          className="btn-primary"
          style={{ fontSize: 14, padding: '18px 48px' }}
          onClick={() => navigate('/reservar')}
        >
          Reservar fecha →
        </button>
      </section>

      {/* FOOTER */}
      <footer style={{ background: 'var(--black)', color: '#666', padding: '48px 80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 20, color: 'white', fontWeight: 400 }}>
          Espacio <span style={{ color: 'var(--gold)' }}>Auditorium</span>
        </div>
        <span>Marcelo T. de Alvear 2153, 2° Piso · Recoleta · CABA</span>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { href: 'https://www.instagram.com/espacioauditoriumeventos/', label: 'Instagram' },
            { href: 'https://my.matterport.com/show/?m=9JaMUZrVdZC', label: 'Tour Virtual' },
          ].map(l => (
            <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
              style={{ color: '#666', fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
              onMouseLeave={e => e.currentTarget.style.color = '#666'}
            >{l.label}</a>
          ))}
        </div>
        <p style={{ width: '100%', textAlign: 'center', fontSize: 11, color: '#444', letterSpacing: '0.05em', marginTop: 8 }}>
          Desarrollado por{' '}
          <a href="https://www.emibugliolo.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#666' }}>
            emibugliolo.com
          </a>
        </p>
      </footer>

      {/* WhatsApp float */}
      <a href="https://wa.me/19898534256?text=Hola%2C%20quiero%20info%20sobre%20el%20espacio" target="_blank" rel="noopener noreferrer" className="whatsapp-float" title="Hablar con alguien del equipo">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>

      {/* Mobile responsive */}
      <style>{`
        .container { max-width: 1200px; margin: 0 auto; }

        @media (max-width: 1024px) {
          .site-nav { padding: 20px 32px !important; }
          section, .usecases-section { padding: 80px 40px !important; }
          .hero-grid { grid-template-columns: 1fr !important; min-height: auto !important; padding-top: 72px !important; }
          .hero-text { padding: 60px 40px !important; order: 2; }
          .hero-grid > div:last-child { min-height: 400px; order: 1; }
          .tour-grid { grid-template-columns: 1fr !important; }
          .tour-grid > div:last-child { min-height: 360px; }
          .location-grid { grid-template-columns: 1fr !important; }
          .location-grid > div:last-child { min-height: 340px; }
          .cotizador-header { grid-template-columns: 1fr !important; gap: 24px !important; }
          .usecases-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .conditions-grid { grid-template-columns: 1fr !important; }
          .reviews-grid { grid-template-columns: 1fr !important; }
        }

        @media (max-width: 768px) {
          .site-nav { padding: 16px 20px !important; }
          .site-nav a { font-size: 15px !important; }
          section { padding: 60px 20px !important; }
          .hero-grid { padding-top: 64px !important; }
          .hero-text { padding: 40px 20px !important; }
          .hero-stats { gap: 24px !important; margin-top: 40px !important; }
          .usecases-grid { grid-template-columns: 1fr !important; }
          .reviews-grid { grid-template-columns: 1fr !important; }
          .cotizador-form { grid-template-columns: 1fr !important; }
          .cotizador-box { padding: 28px 20px !important; }
          .cotizador-result { padding: 24px 20px !important; }
          .conditions-grid > div { padding: 40px 24px !important; }
          .tour-grid > div:first-child { padding: 48px 20px !important; }
          .location-grid > div:first-child { padding: 60px 20px !important; }
          footer { padding: 40px 20px !important; flex-direction: column !important; align-items: flex-start !important; gap: 20px !important; }
          section#cotizar { padding: 60px 20px !important; }
          section#reservar { padding: 80px 20px !important; }
        }

        @media (max-width: 480px) {
          .hero-text { padding: 32px 16px !important; }
          section { padding: 48px 16px !important; }
          section#cotizar { padding: 48px 16px !important; }
          section#reservar { padding: 64px 16px !important; }
          .site-nav { padding: 14px 16px !important; }
          .conditions-grid > div { padding: 32px 16px !important; }
          .cotizador-box { padding: 20px 16px !important; }
        }
      `}</style>
    </>
  )
}

const inputStyle = {
  width: '100%', padding: '14px 16px', border: '1px solid var(--gray-light)',
  borderRadius: 2, fontSize: 15, fontFamily: 'var(--font-sans)',
  background: 'var(--warm-white)', color: 'var(--black)', outline: 'none',
  transition: 'border-color 0.2s', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
}

function FormGroup({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888' }}>{label}</label>
      {children}
    </div>
  )
}

function CaseItem({ icon, title, desc }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{ background: hovered ? '#161616' : '#111', padding: '40px 36px', border: '1px solid #1e1e1e', cursor: 'pointer', transition: 'all 0.3s', position: 'relative', overflow: 'hidden', borderBottom: hovered ? '2px solid var(--gold)' : '2px solid transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ fontSize: 28, marginBottom: 20, display: 'block' }}>{icon}</span>
      <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, color: 'white', marginBottom: 12 }}>{title}</h3>
      <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, fontWeight: 300 }}>{desc}</p>
    </div>
  )
}

function CondItem({ num, title, desc }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{ padding: '60px 48px', background: 'var(--warm-white)', borderTop: hovered ? '3px solid var(--gold)' : '3px solid transparent', transition: 'border-color 0.3s', cursor: 'default' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 400, color: 'var(--gray-light)', display: 'block', lineHeight: 1, marginBottom: 20 }}>{num}</span>
      <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--black)', marginBottom: 10 }}>{title}</h3>
      <p style={{ fontSize: 14, color: '#777', fontWeight: 300, lineHeight: 1.7 }}>{desc}</p>
    </div>
  )
}

function FAQList() {
  const [open, setOpen] = useState(null)
  return (
    <div>
      {FAQS.map((faq, i) => (
        <div key={i} style={{ borderBottom: '1px solid var(--gray-light)' }}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 16, fontWeight: 500, color: open === i ? 'var(--gold)' : 'var(--black)', textAlign: 'left', gap: 16, transition: 'color 0.2s' }}
          >
            <span>{faq.q}</span>
            <span style={{ fontSize: 24, fontWeight: 300, color: 'var(--gold)', flexShrink: 0, transition: 'transform 0.3s', transform: open === i ? 'rotate(45deg)' : 'none', lineHeight: 1 }}>+</span>
          </button>
          <div style={{ maxHeight: open === i ? 300 : 0, overflow: 'hidden', transition: 'max-height 0.4s ease', paddingBottom: open === i ? 24 : 0 }}>
            <p style={{ fontSize: 15, color: '#666', lineHeight: 1.75, fontWeight: 300 }} dangerouslySetInnerHTML={{ __html: faq.a }} />
          </div>
        </div>
      ))}
    </div>
  )
}
