import { Helmet } from 'react-helmet-async'
import Layout from '../components/Layout'

export default function PodcastStreamingPage() {
  return (
    <Layout>
      <Helmet>
        <title>Espacio para Podcast y Streaming en Recoleta, CABA | Espacio Auditorium</title>
        <meta name="description" content="Sala con acústica e iluminación profesional para grabación de podcast, streaming en vivo y contenido audiovisual en Recoleta, CABA. Reserva online con precio instantáneo." />
        <link rel="canonical" href="https://www.espacioauditorium.com.ar/podcast-y-streaming" />
        <meta property="og:title" content="Sala para Podcast y Streaming en Recoleta | Espacio Auditorium" />
        <meta property="og:description" content="Acústica profesional para podcast, streaming en vivo y contenido audiovisual en Recoleta, CABA. Reserva online." />
        <meta property="og:url" content="https://www.espacioauditorium.com.ar/podcast-y-streaming" />
      </Helmet>

      {/* Hero */}
      <section style={{ background: 'var(--black)', padding: '100px 80px 80px', color: 'white' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 32 }}>
          <span style={{ display: 'block', width: 32, height: 1, background: 'var(--gold)' }} />
          Podcast y Streaming
        </span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 400, lineHeight: 1.1, marginBottom: 24 }}>
          Sala para Podcast<br /><em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>y Streaming en Recoleta</em>
        </h1>
        <p style={{ fontSize: 17, fontWeight: 300, color: '#aaa', maxWidth: 580, lineHeight: 1.75, marginBottom: 48 }}>
          La Sala Gaudi fue diseñada para que el contenido que producís quede profesional. Acústica controlada, iluminación adecuada y conectividad para streaming en vivo. Todo con audiencia presencial de hasta 36 personas.
        </p>
        <a href="/reservar" className="btn-primary" style={{ display: 'inline-block', fontSize: 14, padding: '16px 40px', textDecoration: 'none' }}>
          Cotizá tu fecha de grabación →
        </a>
      </section>

      {/* Imagen */}
      <div style={{ height: '50vh', overflow: 'hidden', position: 'relative', background: 'var(--black)' }}>
        <img src="/salagaudi.jpg" alt="Sala Gaudi - Espacio para podcast y streaming en Recoleta CABA" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 40 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 4vw, 52px)', color: 'white', fontWeight: 400, display: 'block', lineHeight: 1.2, marginBottom: 16 }}>
              Producción de contenido<br />en un setting profesional
            </span>
            <span style={{ fontSize: 14, color: 'var(--gold)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sala Gaudi · 36 personas · Acústica profesional</span>
          </div>
        </div>
      </div>

      {/* Por qué */}
      <section style={{ background: 'var(--warm-white)', padding: '80px 80px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.2, marginBottom: 48 }}>
          Por qué Espacio Auditorium<br />para tu contenido
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
          {[
            { icon: '🔊', title: 'Acústica profesional', desc: 'Sala Gaudi fue diseñada con acústica controlada. Sin eco, sin ruido de fondo. Tu audio queda limpio.' },
            { icon: '📡', title: 'Conectividad para streaming', desc: 'WiFi 100MB simétrico para transmitir en vivo a cualquier plataforma sin cortes.' },
            { icon: '💡', title: 'Iluminación adecuada', desc: 'Iluminación regulable diseñada para producciones de video. Tu contenido queda con imagen profesional.' },
            { icon: '👥', title: 'Audiencia presencial + online', desc: 'Hasta 36 personas en vivo mientras transmitís simultáneamente a tu audiencia digital.' },
            { icon: '🔒', title: 'Piso exclusivo', desc: 'Sin interrupciones de otros grupos en el edificio. Ese día el piso completo es de tu producción.' },
            { icon: '📽️', title: 'Proyector para visuales', desc: 'Proyector HDMI para mostrar slides, demos o material de apoyo durante la grabación.' },
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

      {/* Formatos */}
      <section style={{ background: 'var(--black)', padding: '80px 80px', color: 'white' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, lineHeight: 1.2, marginBottom: 40 }}>
          Formatos que funcionan acá
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {[
            { icon: '🎙️', title: 'Podcast en vivo', desc: 'Episodios grabados frente a audiencia real. El setting da producción de calidad.' },
            { icon: '🎤', title: 'Entrevistas con público', desc: 'Tu entrevistado en vivo, con audiencia que puede participar en el Q&A.' },
            { icon: '🎓', title: 'Clases online con presenciales', desc: 'Alumnos en sala + audiencia online simultánea. El formato híbrido que funciona.' },
            { icon: '📱', title: 'Demos en streaming', desc: 'Presentaciones de producto, demos de software, lanzamientos transmitidos en vivo.' },
            { icon: '🚀', title: 'Lanzamientos en vivo', desc: 'Anunciás algo importante con audiencia presencial y amplificación online.' },
            { icon: '📹', title: 'Contenido para redes', desc: 'Reels, Shorts y contenido en formato largo con un set que transmite calidad.' },
          ].map(item => (
            <div key={item.title} style={{ background: '#111', border: '1px solid #1e1e1e', padding: '36px 28px' }}>
              <span style={{ fontSize: 28, display: 'block', marginBottom: 16 }}>{item.icon}</span>
              <h3 style={{ fontSize: 16, fontWeight: 500, color: 'white', marginBottom: 10 }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: '#888', fontWeight: 300, lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quién ya usó el espacio */}
      <section style={{ background: 'var(--off-white)', padding: '80px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.2, marginBottom: 20 }}>
            El espacio ya tiene historial
          </h2>
          <p style={{ fontSize: 16, color: '#666', lineHeight: 1.75, fontWeight: 300, marginBottom: 48 }}>
            Creadores de contenido y podcasters de CABA ya produjeron acá. El espacio fue elegido por su acústica, su estética y la posibilidad de tener audiencia presencial durante la grabación.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
            {[
              { author: 'Pablo González', text: 'Las salas son increíbles, espacios súper útiles. La acústica para nuestro streaming fue perfecta. Volveremos.' },
              { author: 'Santiago Rodríguez', text: 'Excelente espacio para dar conferencias y grabar contenido. Muy nuevo y lindo todo. Totalmente recomendable.' },
            ].map(r => (
              <div key={r.author} style={{ background: 'white', border: '1px solid var(--gray-light)', padding: '32px 28px', textAlign: 'left' }}>
                <span style={{ color: 'var(--gold)', fontSize: 14, letterSpacing: 2, marginBottom: 16, display: 'block' }}>★★★★★</span>
                <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7, fontWeight: 300, fontStyle: 'italic', marginBottom: 20 }}>"{r.text}"</p>
                <span style={{ fontSize: 12, fontWeight: 500, color: '#999', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{r.author}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--gold)', padding: '80px 80px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 400, color: 'var(--black)', marginBottom: 20 }}>
          ¿Cuándo grabás?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.6)', fontWeight: 300, maxWidth: 440, margin: '0 auto 40px' }}>
          Cotizá tu fecha de grabación en segundos. Sin llamadas, sin esperar respuesta.
        </p>
        <a href="/reservar" className="btn-primary" style={{ fontSize: 14, padding: '18px 48px', display: 'inline-block', textDecoration: 'none' }}>
          Cotizá tu fecha de grabación →
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
