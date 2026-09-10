import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import Nav from '../components/Nav'
import HeroImage from '../components/HeroImage'
import MatterportFacade, { MATTERPORT_URL } from '../components/MatterportFacade'
import Cotizador from '../components/Cotizador'
import WhatsAppButton from '../components/WhatsAppButton'
import { SiteFooter } from '../components/Layout'
import { CANCELLATION_POLICY } from '../lib/pricing'

const FAQS = [
  { q: '¿El precio es por sala o por el espacio completo?', a: 'El precio es por el <strong>espacio completo</strong> — no pagás por sala. Al reservar tenés acceso a las tres salas (Gaudi, Pollock y Miro) durante el tiempo contratado.' },
  { q: '¿Cómo reservo una fecha?', a: 'Usás el cotizador de esta misma página: elegís fecha, duración y horario, ves el precio al instante y completás el formulario. Con el <strong>30% de seña</strong> la fecha queda bloqueada y el precio congelado.' },
  { q: '¿Cómo se paga la seña?', a: 'La seña (30%) se abona por <strong>Mercado Pago</strong> (tarjeta, transferencia, débito). El saldo restante (70%) se abona hasta <strong>5 días antes</strong> del evento.' },
  { q: '¿Qué incluye el espacio?', a: '<strong>Sala Gaudi</strong>: proyector HDMI y rotafolio, 36 personas. <strong>Sala Pollock</strong>: TV 42" HDMI, 12 personas. <strong>Sala Miro</strong>: TV 42" HDMI y rotafolio, 15 personas. WiFi 100MB y aire acondicionado incluidos.' },
  { q: '¿Se puede hacer streaming o grabar video?', a: 'Sí. El espacio ya fue usado para <strong>streamings en vivo y grabaciones</strong>. La acústica e iluminación de la Sala Gaudi son ideales para producción de contenido.' },
  { q: '¿Hay descuentos por varios días?', a: 'Sí. Contratando <strong>4 días o más</strong> accedés a un <strong>15% de descuento</strong> automático. Podés calcularlo en el cotizador.' },
  { q: '¿Dónde está ubicado?', a: '<strong>Marcelo T. de Alvear 2153, 2° Piso, Recoleta, CABA.</strong> Frente a la Facultad de Odontología UBA, a dos cuadras de Medicina. Subte línea D y múltiples colectivos.' },
  { q: '¿Puedo visitar el espacio antes de reservar?', a: 'Podés hacer el <strong>recorrido virtual 360°</strong> desde esta misma página. Si querés una visita presencial, escribinos por WhatsApp y coordinamos.' },
  { q: '¿Cuál es la política de cancelación?', a: CANCELLATION_POLICY },
]

export default function HomePage() {
  return (
    <>
      <Helmet>
        <title>Alquiler de Auditorio en Recoleta, CABA | Espacio Auditorium</title>
        <meta name="description" content="Auditorio boutique para 36 personas y 3 salas en Recoleta, CABA. Conferencias, capacitaciones y streaming. Reserva online con precio instantáneo. Seña del 30% por Mercado Pago." />
        <link rel="canonical" href="https://www.espacioauditorium.com.ar/" />
        <meta property="og:title" content="Alquiler de Auditorio en Recoleta, CABA | Espacio Auditorium" />
        <meta property="og:description" content="Auditorio para 36 personas y 3 salas en Recoleta, CABA. Conferencias, capacitaciones y streaming. Reserva online con precio instantáneo." />
        <meta property="og:url" content="https://www.espacioauditorium.com.ar/" />
        <meta property="og:image" content="https://www.espacioauditorium.com.ar/salagaudi.jpg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Sala Gaudi - Auditorio Espacio Auditorium, Recoleta Buenos Aires" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Alquiler de Auditorio en Recoleta, CABA | Espacio Auditorium" />
        <meta name="twitter:description" content="Auditorio para 36 personas y 3 salas en Recoleta, CABA. Conferencias, capacitaciones y streaming. Reserva online con precio instantáneo." />
        <meta name="twitter:image" content="https://www.espacioauditorium.com.ar/salagaudi.jpg" />
      </Helmet>
      <Nav />

      {/* HERO */}
      <section className="hero-grid" style={{ minHeight: '100vh', display: 'grid', gridTemplateColumns: '1fr 1fr', paddingTop: 80 }}>
        <div className="hero-text" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '80px 64px 80px 80px' }}>
          <span className="anim-1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 32 }}>
            <span style={{ display: 'block', width: 32, height: 1, background: 'var(--gold)' }} />
            Recoleta · Buenos Aires
          </span>

          <h1 className="anim-2" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(44px, 5vw, 68px)', fontWeight: 400, lineHeight: 1.1, color: 'var(--black)', marginBottom: 28, letterSpacing: '-0.01em' }}>
            Tu evento<br />{' '}en <em style={{ fontStyle: 'italic', color: 'var(--gold)' }}>primera<br />{' '}fila.</em>
          </h1>

          <p className="anim-3" style={{ fontSize: 16, fontWeight: 300, color: '#555', lineHeight: 1.7, maxWidth: 420, marginBottom: 48 }}>
            Auditorio para 36 personas y salas de reunión en Recoleta, CABA. Conferencias, capacitaciones, streamings y presentaciones corporativas.
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
          <HeroImage
            priority
            alt="Sala Gaudi - Auditorio Espacio Auditorium Recoleta Buenos Aires"
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
          El espacio se adapta<br />{' '}a tu formato.
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
            Recorrelo antes<br />{' '}de reservar.
          </h2>
          <p style={{ fontSize: 16, color: '#666', fontWeight: 300, lineHeight: 1.7, marginBottom: 32 }}>
            Tres salas, un piso completo. Navegá el recorrido virtual 360° y conocé cada rincón del espacio antes de dar el paso.
          </p>
          <a href={MATTERPORT_URL} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: 'inline-block', width: 'fit-content' }}>
            Abrir tour en pantalla completa →
          </a>
        </div>
        <div style={{ position: 'relative', overflow: 'hidden', minHeight: 500 }}>
          <MatterportFacade />
        </div>
      </div>

      {/* COTIZADOR */}
      <section id="cotizar" style={{ background: 'var(--warm-white)', padding: '100px 80px' }}>
        <div className="cotizador-header" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, marginBottom: 64, alignItems: 'end' }}>
          <div>
            <span className="section-tag">Cotizador instantáneo</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.15 }}>
              Precio en<br />{' '}segundos.
            </h2>
          </div>
          <p style={{ fontSize: 16, color: 'var(--light-muted)', fontWeight: 300, lineHeight: 1.7 }}>
            Sin esperar. Elegís la fecha y la duración, y el precio aparece al instante. Después reservás con el 30% de seña vía Mercado Pago.
          </p>
        </div>

        <Cotizador />

        <div className="conditions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, marginTop: 64 }}>
          {[
            { num: '01', title: 'Seña del 30%', desc: 'Con el 30% del total reservás la fecha y el precio queda congelado. Se abona por Mercado Pago (tarjeta, transferencia o débito).' },
            { num: '02', title: 'Saldo 5 días antes', desc: 'El 70% restante se abona hasta 5 días antes del evento. Sin sorpresas ni costos adicionales.' },
            { num: '03', title: 'Cancelación', desc: CANCELLATION_POLICY },
          ].map(c => (
            <div key={c.num} className="cond-item">
              <span aria-hidden="true" style={{ fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 400, color: 'var(--gray-light)', display: 'block', lineHeight: 1, marginBottom: 20 }}>{c.num}</span>
              <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--black)', marginBottom: 10 }}>{c.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--light-muted)', fontWeight: 300, lineHeight: 1.7 }}>{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section style={{ background: 'var(--black)', color: 'white', padding: '100px 80px' }}>
        <span className="section-tag" style={{ color: 'var(--gold)' }}>Lo que dicen los que estuvieron</span>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 400, color: 'white', lineHeight: 1.15, marginBottom: 60 }}>
          4.9 en Google.<br />{' '}Sin palabras.
        </h2>
        <div className="reviews-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { author: 'Pablo González', text: 'Las salas son increíbles, espacios súper útiles, la atención que nos brindaron impecable. Todo súper limpio y acorde. Volveremos a elegir el espacio para más eventos.' },
            { author: 'Mati Du', text: 'El espacio está impecable. De los mejores auditorios de CABA. La atención de Sebastián y equipo, 10 puntos. Gracias por todo.' },
            { author: 'Santiago Rodríguez', text: 'Excelente espacio para dar conferencias, muy nuevo y lindo todo. La atención para cerrar la fecha como también para el evento fue muy buena.' },
          ].map((r) => (
            <div key={r.author} style={{ background: '#111', border: '1px solid #1e1e1e', padding: 36, borderRadius: 4 }}>
              <span style={{ color: 'var(--gold)', fontSize: 14, letterSpacing: 2, marginBottom: 20, display: 'block' }}>★★★★★</span>
              <p style={{ fontSize: 15, color: '#ccc', lineHeight: 1.7, fontWeight: 300, fontStyle: 'italic', marginBottom: 24 }}>&ldquo;{r.text}&rdquo;</p>
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
            En el corazón<br />{' '}de Recoleta.
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
            Todo lo que<br />{' '}necesitás saber.
          </h2>
          <FAQList />
        </div>
      </section>

      {/* CTA FINAL */}
      <section id="reservar" style={{ background: 'var(--gold)', padding: '100px 80px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(36px, 4vw, 56px)', fontWeight: 400, color: 'var(--black)', marginBottom: 24 }}>
          ¿Tu fecha está<br />{' '}disponible?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.6)', fontWeight: 300, maxWidth: 480, margin: '0 auto 48px' }}>
          Cotizá en segundos y reservá con el 30% de seña. Sin llamadas, sin esperar respuesta.
        </p>
        <a
          href="/reservar"
          className="btn-primary"
          style={{ fontSize: 14, padding: '18px 48px', display: 'inline-block', textDecoration: 'none' }}
        >
          Reservar fecha →
        </a>
      </section>

      <SiteFooter />
      <WhatsAppButton variant="float" />

      {/* Mobile responsive */}
      <style>{`
        .container { max-width: 1200px; margin: 0 auto; }

        @media (max-width: 1024px) {
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
          section#cotizar { padding: 60px 20px !important; }
          section#reservar { padding: 80px 20px !important; }
        }

        @media (max-width: 480px) {
          .hero-text { padding: 32px 16px !important; }
          section { padding: 48px 16px !important; }
          section#cotizar { padding: 48px 16px !important; }
          section#reservar { padding: 64px 16px !important; }
          .conditions-grid > div { padding: 32px 16px !important; }
          .cotizador-box { padding: 20px 16px !important; }
        }
      `}</style>
    </>
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
