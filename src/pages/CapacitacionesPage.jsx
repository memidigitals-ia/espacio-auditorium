import { Helmet } from 'react-helmet-async'
import Layout from '../components/Layout'

export default function CapacitacionesPage() {
  return (
    <Layout>
      <Helmet>
        <title>Sala para Capacitaciones y Workshops en Recoleta, CABA | Espacio Auditorium</title>
        <meta name="description" content="Espacio para capacitaciones de hasta 36 personas en Recoleta, CABA. Piso completo con 3 salas incluidas. Proyector, TV y WiFi. Reserva online sin llamadas." />
        <link rel="canonical" href="https://www.espacioauditorium.com.ar/capacitaciones" />
        <meta property="og:title" content="Sala para Capacitaciones y Workshops | Espacio Auditorium Recoleta" />
        <meta property="og:description" content="Espacio para capacitaciones de hasta 36 personas en Recoleta. Piso completo con 3 salas, proyector, TV y WiFi. Reserva online." />
        <meta property="og:url" content="https://www.espacioauditorium.com.ar/capacitaciones" />
      </Helmet>

      {/* Hero */}
      <section style={{ background: 'var(--black)', padding: '100px 80px 80px', color: 'white' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 32 }}>
          <span style={{ display: 'block', width: 32, height: 1, background: 'var(--gold)' }} />
          Capacitaciones y Workshops
        </span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 400, lineHeight: 1.1, marginBottom: 24 }}>
          Espacio para Capacitaciones<br /><em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>y Workshops en Recoleta</em>
        </h1>
        <p style={{ fontSize: 17, fontWeight: 300, color: '#aaa', maxWidth: 580, lineHeight: 1.75, marginBottom: 48 }}>
          Llevá tu capacitación a un nivel profesional. Espacio Auditorium tiene el espacio, el equipamiento y la ubicación para que tus participantes lleguen, se concentren y aprendan sin distracciones.
        </p>
        <a href="/reservar" className="btn-primary" style={{ display: 'inline-block', fontSize: 14, padding: '16px 40px', textDecoration: 'none' }}>
          Cotizá tu capacitación →
        </a>
      </section>

      {/* Por qué */}
      <section style={{ background: 'var(--warm-white)', padding: '80px 80px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.2, marginBottom: 48 }}>
          Por qué funciona para capacitaciones
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 2 }}>
          {[
            { icon: '🏛️', title: '3 salas incluidas', desc: 'La dinámica de tu taller puede necesitar diferentes configuraciones: plenario en Gaudi, grupos pequeños en Pollock y Miró. Todo en el mismo precio.' },
            { icon: '📺', title: 'TV 42" HDMI en salas de breakout', desc: 'Pollock y Miró tienen televisores 42" HDMI para presentaciones en grupos reducidos, sin depender de la sala principal.' },
            { icon: '📋', title: 'Pizarrón y rotafolio', desc: 'Para metodologías activas, ejercicios en grupo y dinámicas participativas. Disponibles en todas las salas.' },
            { icon: '👥', title: 'Evento único del día', desc: 'No compartís el espacio con otros grupos. Tus participantes pueden moverse libremente por el piso sin cruzarse con desconocidos.' },
            { icon: '🚇', title: 'Acceso directo desde el subte', desc: 'A metros de la Línea D (Pueyrredón o Facultad de Medicina). Tus participantes llegan fácil desde cualquier punto de CABA.' },
            { icon: '⏰', title: 'Sin burocracia', desc: 'Reserva online en 5 minutos, confirmación inmediata, acceso directo el día del evento. Sin trámites ni coordinación adicional.' },
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

      {/* Tipos de capacitaciones */}
      <section style={{ background: 'var(--black)', padding: '80px 80px', color: 'white' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, lineHeight: 1.2, marginBottom: 40 }}>
          Tipos de capacitaciones<br />que organizamos
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {[
            { title: 'Talleres prácticos', desc: 'Dinámicas participativas con grupos que se dividen entre salas.' },
            { title: 'Formación interna', desc: 'Para equipos de empresas que necesitan un espacio fuera de la oficina.' },
            { title: 'Cursos de actualización', desc: 'Para profesionales, médicos, contadores, abogados y otros.' },
            { title: 'Jornadas de entrenamiento', desc: 'Para coaches, instructores y formadores con grupos propios.' },
            { title: 'Capacitación a clientes', desc: 'Para empresas que capacitan a su red de distribución o clientes.' },
            { title: 'Workshops creativos', desc: 'Diseño, innovación, metodologías ágiles y dinámicas de grupo.' },
          ].map(item => (
            <div key={item.title} style={{ background: '#111', border: '1px solid #1e1e1e', padding: '36px 28px' }}>
              <span style={{ display: 'block', width: 32, height: 2, background: 'var(--gold)', marginBottom: 20 }} />
              <h3 style={{ fontSize: 16, fontWeight: 500, color: 'white', marginBottom: 10 }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: '#888', fontWeight: 300, lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Configuración flexible */}
      <section style={{ background: 'var(--off-white)', padding: '80px 80px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.2, marginBottom: 20 }}>
            Configuraciones posibles
          </h2>
          <p style={{ fontSize: 16, color: '#666', fontWeight: 300, lineHeight: 1.75, marginBottom: 48 }}>
            Al reservar Espacio Auditorium tenés 3 salas y podés usarlas como mejor se adapte a tu metodología.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {[
              { config: 'Plenario + breakout', desc: 'Clase magistral en Gaudi y grupos pequeños en Pollock y Miró simultáneamente.' },
              { config: 'Rotación de estaciones', desc: 'Tres grupos que rotan entre las tres salas durante la capacitación.' },
              { config: 'Jornada completa', desc: 'Todo el grupo en Gaudi (hasta 36p) con las otras salas para pausas y networking.' },
            ].map(item => (
              <div key={item.config} style={{ background: 'white', border: '1px solid var(--gray-light)', padding: '36px 28px' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400, color: 'var(--black)', marginBottom: 12 }}>{item.config}</h3>
                <p style={{ fontSize: 14, color: '#666', fontWeight: 300, lineHeight: 1.65 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--gold)', padding: '80px 80px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 400, color: 'var(--black)', marginBottom: 20 }}>
          ¿Cuándo es tu capacitación?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.6)', fontWeight: 300, maxWidth: 440, margin: '0 auto 40px' }}>
          Cotizá en segundos y reservá el espacio con el 30% de seña. Sin llamadas, sin esperar respuesta.
        </p>
        <a href="/reservar" className="btn-primary" style={{ fontSize: 14, padding: '18px 48px', display: 'inline-block', textDecoration: 'none' }}>
          Cotizá tu capacitación →
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
