import { Helmet } from 'react-helmet-async'
import Layout from '../components/Layout'

export default function LanzamientosPage() {
  return (
    <Layout>
      <Helmet>
        <title>Espacio para Lanzamientos de Productos y Programas en CABA | Espacio Auditorium</title>
        <meta name="description" content="Venue boutique para lanzamientos de productos, programas y servicios en Recoleta, CABA. Hasta 36 personas, piso completo exclusivo, streaming disponible. Reserva online." />
        <link rel="canonical" href="https://www.espacioauditorium.com.ar/lanzamientos" />
        <meta property="og:title" content="Venue para Lanzamientos en Recoleta, CABA | Espacio Auditorium" />
        <meta property="og:description" content="Venue boutique para lanzamientos de productos, programas y servicios. Hasta 36 personas, exclusividad total, streaming disponible. Recoleta, CABA." />
        <meta property="og:url" content="https://www.espacioauditorium.com.ar/lanzamientos" />
      </Helmet>

      {/* Hero */}
      <section style={{ background: 'var(--black)', padding: '100px 80px 80px', color: 'white' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 32 }}>
          <span style={{ display: 'block', width: 32, height: 1, background: 'var(--gold)' }} />
          Lanzamientos
        </span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 400, lineHeight: 1.1, marginBottom: 24 }}>
          Venue para Lanzamientos<br /><em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>de Productos en CABA</em>
        </h1>
        <p style={{ fontSize: 17, fontWeight: 300, color: '#aaa', maxWidth: 580, lineHeight: 1.75, marginBottom: 48 }}>
          El lanzamiento es uno de los momentos más importantes para tu negocio. El espacio donde lo hacés define cómo te percibe tu audiencia. Espacio Auditorium es boutique por diseño: íntimo, profesional y exclusivo para tu evento.
        </p>
        <a href="/reservar" className="btn-primary" style={{ display: 'inline-block', fontSize: 14, padding: '16px 40px', textDecoration: 'none' }}>
          Cotizá tu lanzamiento →
        </a>
      </section>

      {/* Imagen */}
      <div style={{ height: '50vh', overflow: 'hidden', position: 'relative', background: 'var(--black)' }}>
        <img src="/salagaudi.jpg" alt="Sala Gaudi - Venue para lanzamientos en Recoleta CABA" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: '0 80px 60px' }}>
          <div>
            <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', display: 'block', marginBottom: 12 }}>Sala Gaudi · Auditorio principal</span>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'white', fontWeight: 400 }}>Formato teatro · 36 personas · Exclusividad total</p>
          </div>
        </div>
      </div>

      {/* Lo que obtenés */}
      <section style={{ background: 'var(--warm-white)', padding: '80px 80px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.2, marginBottom: 48 }}>
          Lo que obtenés
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
          {[
            { icon: '🎭', title: 'Auditorio de alto impacto', desc: 'Sala Gaudi con butacas para hasta 36 personas. El formato teatro perfecto para presentaciones que necesitan impresionar.' },
            { icon: '📡', title: 'Streaming disponible', desc: 'Transmitís el lanzamiento en vivo a tu audiencia online mientras sucede el evento presencial. Alcance ilimitado.' },
            { icon: '🏢', title: 'Piso completo para todo tu evento', desc: 'Sala principal + zonas para networking, café y registro de entrada. Tus asistentes viven una experiencia completa.' },
            { icon: '🔒', title: 'Exclusividad total', desc: 'Ese día el espacio es solo tuyo. Sin otros eventos, sin compartir espacios, sin ruidos de fondo.' },
            { icon: '📍', title: 'Recoleta, CABA', desc: 'El contexto geográfico que acompaña el posicionamiento de tu marca. La zona más premium de Buenos Aires.' },
            { icon: '⚡', title: 'Reserva online instantánea', desc: 'Sin llamadas, sin coordinación. Reservás online con el 30% de seña y tenés confirmación inmediata.' },
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

      {/* Quién viene */}
      <section style={{ background: 'var(--black)', padding: '80px 80px', color: 'white' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, lineHeight: 1.2, marginBottom: 40 }}>
          Quién viene a lanzar acá
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {[
            'Coaches que presentan sus nuevos programas y metodologías',
            'Startups con lanzamiento de producto al mercado',
            'Marcas con presentación para clientes y prensa especializada',
            'Autores que presentan su libro con audiencia real',
            'Consultoras con evento inaugural o nuevo servicio',
            'Emprendedores que quieren hacer su lanzamiento diferente',
          ].map(item => (
            <div key={item} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '20px 0', borderBottom: '1px solid #1e1e1e' }}>
              <span style={{ color: 'var(--gold)', fontSize: 18, flexShrink: 0 }}>→</span>
              <span style={{ fontSize: 15, color: '#ccc', fontWeight: 300, lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Diferencial */}
      <section style={{ background: 'var(--off-white)', padding: '80px 80px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.2, marginBottom: 20 }}>
            Boutique por diseño
          </h2>
          <p style={{ fontSize: 16, color: '#666', lineHeight: 1.75, fontWeight: 300, marginBottom: 48 }}>
            Un salón de hotel tiene 300 eventos por año. Un centro de convenciones comparte el edificio con desconocidos. Espacio Auditorium tiene <strong>un único evento por día</strong>. Tu lanzamiento no compite con nadie más.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {[
              { title: 'Íntimo y profesional', desc: 'El tamaño correcto para que la presentación se sienta exclusiva y cercana.' },
              { title: 'Un evento por día', desc: 'El piso es tuyo. Nadie más accede ese día.' },
              { title: 'Streaming incluido', desc: 'Tu lanzamiento llega a la audiencia online mientras pasa el presencial.' },
            ].map(item => (
              <div key={item.title} style={{ background: 'white', border: '1px solid var(--gray-light)', padding: '40px 32px' }}>
                <span style={{ display: 'block', width: 40, height: 3, background: 'var(--gold)', marginBottom: 24 }} />
                <h3 style={{ fontSize: 16, fontWeight: 500, color: 'var(--black)', marginBottom: 12 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: '#666', fontWeight: 300, lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--gold)', padding: '80px 80px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 400, color: 'var(--black)', marginBottom: 20 }}>
          ¿Cuándo es tu lanzamiento?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.6)', fontWeight: 300, maxWidth: 440, margin: '0 auto 40px' }}>
          Cotizá en segundos y reservá con el 30% de seña. Sin llamadas, sin esperar respuesta.
        </p>
        <a href="/reservar" className="btn-primary" style={{ fontSize: 14, padding: '18px 48px', display: 'inline-block', textDecoration: 'none' }}>
          Cotizá tu lanzamiento →
        </a>
      </section>

      <style>{`
        @media (max-width: 768px) {
          section { padding: 60px 20px !important; }
          div[style*="grid-template-columns: repeat(2"] { grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: repeat(3"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Layout>
  )
}
