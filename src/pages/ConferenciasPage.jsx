import { Helmet } from 'react-helmet-async'
import Layout from '../components/Layout'

export default function ConferenciasPage() {
  return (
    <Layout>
      <Helmet>
        <title>Sala para Conferencias y Charlas en Recoleta, CABA | Espacio Auditorium</title>
        <meta name="description" content="Auditorio para conferencias y charlas de hasta 36 personas en Recoleta, CABA. Proyector HDMI, butacas, acústica profesional. Reserva online con precio al instante." />
        <link rel="canonical" href="https://www.espacioauditorium.com.ar/conferencias" />
        <meta property="og:title" content="Sala para Conferencias y Charlas | Espacio Auditorium Recoleta" />
        <meta property="og:description" content="Auditorio para conferencias de hasta 36 personas en Recoleta, CABA. Proyector HDMI, butacas, acústica profesional. Reserva online." />
        <meta property="og:url" content="https://www.espacioauditorium.com.ar/conferencias" />
      </Helmet>

      {/* Hero */}
      <section style={{ background: 'var(--black)', padding: '100px 80px 80px', color: 'white' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 32 }}>
          <span style={{ display: 'block', width: 32, height: 1, background: 'var(--gold)' }} />
          Conferencias y Charlas
        </span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 400, lineHeight: 1.1, marginBottom: 24 }}>
          Sala para Conferencias<br /><em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>y Charlas en Recoleta</em>
        </h1>
        <p style={{ fontSize: 17, fontWeight: 300, color: '#aaa', maxWidth: 580, lineHeight: 1.75, marginBottom: 48 }}>
          Organizá tu conferencia o charla en un auditorio boutique diseñado para que tu presentación impacte desde el primer minuto. Hasta 36 personas, proyector HDMI, butacas y piso completo incluido.
        </p>
        <a href="/reservar" className="btn-primary" style={{ display: 'inline-block', fontSize: 14, padding: '16px 40px', textDecoration: 'none' }}>
          Cotizá tu conferencia →
        </a>
      </section>

      {/* Imagen hero */}
      <div style={{ height: '50vh', overflow: 'hidden', position: 'relative', background: 'var(--black)' }}>
        <img src="/salagaudi.jpg" alt="Sala Gaudi - Auditorio para conferencias en Recoleta CABA" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
        <div style={{ position: 'absolute', bottom: 40, left: 80, color: 'white' }}>
          <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', display: 'block', marginBottom: 8 }}>Sala Gaudi · Auditorio principal</span>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 400 }}>36 personas · Butacas · Proyector HDMI</p>
        </div>
      </div>

      {/* Por qué */}
      <section style={{ background: 'var(--warm-white)', padding: '80px 80px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.2, marginBottom: 48 }}>
          Por qué elegir Espacio Auditorium<br />para tu conferencia
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
          {[
            { icon: '🎙️', title: 'Auditorio de 36 personas', desc: 'Butacas cómodas y visibilidad perfecta desde todos los asientos. Formato teatro diseñado para presentaciones.' },
            { icon: '📽️', title: 'Proyector HDMI listo', desc: 'Sin configuraciones ni tiempos muertos. El proyector está listo desde el primer minuto de tu reserva.' },
            { icon: '🏢', title: 'Piso completo incluido', desc: 'Sala Gaudi + Sala Pollock (12p) + Sala Miró (15p). Podés armar break-out sessions o zona de networking sin costo extra.' },
            { icon: '🔇', title: 'Un único evento por día', desc: 'Sin ruido de fondo ni interrupciones. Ese día el piso completo es exclusivamente tuyo.' },
            { icon: '🔊', title: 'Acústica profesional', desc: 'Sala Gaudi fue diseñada con acústica controlada para presentaciones, Q&A y streaming en vivo.' },
            { icon: '📍', title: 'Ubicación premium', desc: 'Recoleta, CABA. A metros del subte Línea D (Pueyrredón o Facultad de Medicina). Fácil acceso desde toda la ciudad.' },
          ].map(item => (
            <div key={item.title} style={{ background: 'white', border: '1px solid var(--gray-light)', padding: '40px 36px', display: 'flex', gap: 24 }}>
              <span style={{ fontSize: 32, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--black)', marginBottom: 10 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: '#666', lineHeight: 1.65, fontWeight: 300 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ideal para */}
      <section style={{ background: 'var(--black)', padding: '80px 80px', color: 'white' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, lineHeight: 1.2, marginBottom: 40 }}>
            Ideal para
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
            {[
              'Coaches y mentores que dictan sus propias charlas',
              'Consultores con presentaciones para clientes',
              'Médicos y profesionales de salud con jornadas de formación',
              'Startups con pitch events y presentaciones de producto',
              'Comunidades con encuentros y meetups mensuales',
              'Autores que presentan su libro al público',
            ].map(item => (
              <div key={item} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '16px 0', borderBottom: '1px solid #1e1e1e' }}>
                <span style={{ color: 'var(--gold)', fontSize: 16, flexShrink: 0, marginTop: 1 }}>→</span>
                <span style={{ fontSize: 15, color: '#ccc', fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Precio y reserva */}
      <section style={{ background: 'var(--off-white)', padding: '80px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.2, marginBottom: 20 }}>
              Precios y reserva
            </h2>
            <p style={{ fontSize: 16, color: '#666', lineHeight: 1.75, fontWeight: 300, marginBottom: 32 }}>
              Cotizá online en 2 minutos. Elegís fecha y duración, ves el precio al instante y reservás con el 30% de seña. Sin llamadas, sin esperar confirmación.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 40 }}>
              {[
                'Media jornada (4 hs): mañana o tarde',
                'Jornada completa (8 hs)',
                'Múltiples días con descuento del 15%',
              ].map(item => (
                <li key={item} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 15, color: '#555' }}>
                  <span style={{ width: 6, height: 6, background: 'var(--gold)', borderRadius: '50%', flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>
            <a href="/reservar" className="btn-primary" style={{ display: 'inline-block', fontSize: 14, padding: '16px 40px', textDecoration: 'none' }}>
              Cotizá tu conferencia →
            </a>
          </div>
          <div style={{ background: 'var(--black)', padding: '48px 40px', borderRadius: 4, color: 'white' }}>
            <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 24, display: 'block' }}>El proceso</span>
            {[
              { num: '1', text: 'Entrás al cotizador y elegís tu fecha, duración y horario' },
              { num: '2', text: 'El precio total y la seña aparecen al instante en pantalla' },
              { num: '3', text: 'Completás el formulario con los datos de tu evento' },
              { num: '4', text: 'Pagás el 30% de seña por Mercado Pago y la fecha queda bloqueada' },
            ].map(step => (
              <div key={step.num} style={{ display: 'flex', gap: 20, marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #1e1e1e' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--gold)', flexShrink: 0, lineHeight: 1 }}>{step.num}</span>
                <p style={{ fontSize: 14, color: '#ccc', fontWeight: 300, lineHeight: 1.6 }}>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--gold)', padding: '80px 80px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 400, color: 'var(--black)', marginBottom: 20 }}>
          ¿Cuándo es tu conferencia?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.6)', fontWeight: 300, maxWidth: 440, margin: '0 auto 40px' }}>
          Cotizá en segundos y reservá el espacio con el 30% de seña. Sin llamadas, sin esperar respuesta.
        </p>
        <a href="/reservar" className="btn-primary" style={{ fontSize: 14, padding: '18px 48px', display: 'inline-block', textDecoration: 'none' }}>
          Cotizá tu conferencia →
        </a>
      </section>

      <style>{`
        @media (max-width: 768px) {
          section { padding: 60px 20px !important; }
          div[style*="grid-template-columns: repeat(2"] { grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          div[style*="height: 50vh"] > p { left: 20px !important; }
        }
      `}</style>
    </Layout>
  )
}
