import { Helmet } from 'react-helmet-async'
import Layout from '../components/Layout'

const salas = [
  {
    nombre: 'Sala Gaudi',
    capacidad: '36 personas',
    descripcion: 'El auditorio principal. Formato teatro con butacas rojas, proyector HDMI, rotafolio y acústica profesional diseñada para presentaciones, charlas y streaming en vivo.',
    equipamiento: ['Proyector HDMI', 'Rotafolio', 'Acústica profesional', 'Iluminación regulable', 'WiFi 100MB'],
    badge: 'Auditorio principal',
  },
  {
    nombre: 'Sala Pollock',
    capacidad: '12 personas',
    descripcion: 'Sala de reuniones íntima. Ideal para sesiones de breakout, entrevistas, grabaciones de podcast o reuniones de equipo durante el evento.',
    equipamiento: ['TV 42" HDMI', 'Mesa de reuniones', 'WiFi 100MB', 'Aire acondicionado'],
    badge: 'Sala de reuniones',
  },
  {
    nombre: 'Sala Miró',
    capacidad: '15 personas',
    descripcion: 'La sala más versátil del piso. Con TV HDMI y rotafolio, funciona para sesiones de trabajo en grupos pequeños, zona de networking o espacio de registro.',
    equipamiento: ['TV 42" HDMI', 'Rotafolio', 'WiFi 100MB', 'Aire acondicionado'],
    badge: 'Sala multipropósito',
  },
]

export default function SalasPage() {
  return (
    <Layout>
      <Helmet>
        <title>Salas Gaudi, Pollock y Miró — Auditorio Boutique | Espacio Auditorium</title>
        <meta name="description" content="Piso completo con 3 salas: Gaudi (36p), Pollock (12p) y Miró (15p). Un único precio incluye todo el espacio. Proyector HDMI, TV 42&quot; y acústica profesional. Recoleta, CABA." />
        <link rel="canonical" href="https://www.espacioauditorium.com.ar/salas" />
        <meta property="og:title" content="Salas Gaudi, Pollock y Miró | Espacio Auditorium Recoleta" />
        <meta property="og:description" content="Piso completo con 3 salas (36, 12 y 15 personas) por un único precio. Proyector, TV, acústica profesional. Recoleta, CABA." />
        <meta property="og:url" content="https://www.espacioauditorium.com.ar/salas" />
      </Helmet>

      {/* Hero */}
      <section style={{ background: 'var(--black)', padding: '100px 80px 80px', color: 'white' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 32 }}>
          <span style={{ display: 'block', width: 32, height: 1, background: 'var(--gold)' }} />
          Recoleta · Buenos Aires
        </span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 5vw, 64px)', fontWeight: 400, lineHeight: 1.1, marginBottom: 24 }}>
          Tres salas.<br /><em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Un único precio.</em>
        </h1>
        <p style={{ fontSize: 18, fontWeight: 300, color: '#aaa', maxWidth: 560, lineHeight: 1.7, marginBottom: 48 }}>
          Al reservar Espacio Auditorium tenés acceso al piso completo. No se alquilan salas por separado.
        </p>
        <div style={{ display: 'flex', gap: 40, paddingTop: 40, borderTop: '1px solid #222' }}>
          {[['36', 'Capacidad máx.'], ['3', 'Salas incluidas'], ['1', 'Evento por día']].map(([num, label]) => (
            <div key={label}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 400, color: 'var(--gold)', display: 'block', lineHeight: 1, marginBottom: 6 }}>{num}</span>
              <span style={{ fontSize: 12, color: '#666', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Salas */}
      <section style={{ background: 'var(--warm-white)', padding: '80px 80px' }}>
        <div style={{ display: 'grid', gap: 2 }}>
          {salas.map((sala, i) => (
            <div key={sala.nombre} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0,
              background: i % 2 === 0 ? 'white' : 'var(--off-white)',
              border: '1px solid var(--gray-light)',
            }}>
              <div style={{ padding: '60px 56px' }}>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12, display: 'block' }}>
                  {sala.badge}
                </span>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.15, marginBottom: 8 }}>
                  {sala.nombre}
                </h2>
                <p style={{ fontSize: 16, color: 'var(--gold)', fontWeight: 500, marginBottom: 24 }}>
                  {sala.capacidad}
                </p>
                <p style={{ fontSize: 15, color: '#666', lineHeight: 1.75, fontWeight: 300, marginBottom: 32 }}>
                  {sala.descripcion}
                </p>
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {sala.equipamiento.map(item => (
                    <li key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#555' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ background: '#f5f3f0', minHeight: 320, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {sala.nombre === 'Sala Gaudi' ? (
                  <img src="/salagaudi.jpg" alt="Sala Gaudi - Auditorio Espacio Auditorium Recoleta" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: 56, color: '#ddd', display: 'block', marginBottom: 16 }}>{sala.nombre.split(' ')[1]}</span>
                    <span style={{ fontSize: 12, color: '#bbb', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{sala.capacidad}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Por qué piso completo */}
      <section style={{ background: 'var(--black)', padding: '80px 80px', color: 'white' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <span className="section-tag" style={{ color: 'var(--gold)' }}>La diferencia</span>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, lineHeight: 1.2, marginBottom: 20 }}>
            Piso completo exclusivo.<br />Sin otros eventos.
          </h2>
          <p style={{ fontSize: 16, color: '#aaa', lineHeight: 1.75, fontWeight: 300, marginBottom: 48 }}>
            Espacio Auditorium trabaja con <strong style={{ color: 'white' }}>un único evento por día</strong>. Al reservar, las tres salas son exclusivamente tuyas durante todo el tiempo contratado. Sin ruido de fondo, sin compartir espacios comunes, sin interrupciones.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {[
              { icon: '🔒', title: 'Exclusividad total', desc: 'El piso es tuyo. Nadie más accede durante tu evento.' },
              { icon: '🎯', title: 'Sin sorpresas', desc: 'Precio único por el espacio completo, sin costos adicionales.' },
              { icon: '🔊', title: 'Sin interferencias', desc: 'Un evento por día garantiza cero ruido de otros grupos.' },
            ].map(item => (
              <div key={item.title} style={{ background: '#111', border: '1px solid #1e1e1e', padding: '32px 28px' }}>
                <span style={{ fontSize: 28, display: 'block', marginBottom: 16 }}>{item.icon}</span>
                <h3 style={{ fontSize: 15, fontWeight: 500, color: 'white', marginBottom: 8 }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: '#888', fontWeight: 300, lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tour virtual */}
      <section style={{ padding: '80px 80px', background: 'var(--off-white)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <span className="section-tag">Conocé el espacio</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.2, marginBottom: 20 }}>
              Recorrelo en 360°<br />antes de reservar.
            </h2>
            <p style={{ fontSize: 15, color: '#666', lineHeight: 1.75, fontWeight: 300, marginBottom: 32 }}>
              Navegá el recorrido virtual y conocé cada rincón de las tres salas antes de dar el paso.
            </p>
            <a href="https://my.matterport.com/show/?m=9JaMUZrVdZC" target="_blank" rel="noopener noreferrer"
              style={{ display: 'inline-block', color: 'var(--gold)', fontSize: 14, fontWeight: 500, letterSpacing: '0.06em', textDecoration: 'none' }}>
              Abrir tour en pantalla completa →
            </a>
          </div>
          <div style={{ position: 'relative', paddingTop: '56.25%', overflow: 'hidden', borderRadius: 4 }}>
            <iframe
              src="https://my.matterport.com/show/?m=9JaMUZrVdZC"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              allowFullScreen allow="vr" loading="lazy"
              title="Tour virtual Espacio Auditorium"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--gold)', padding: '80px 80px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 400, color: 'var(--black)', marginBottom: 20 }}>
          ¿Tu fecha está disponible?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.6)', fontWeight: 300, maxWidth: 440, margin: '0 auto 40px' }}>
          Cotizá en segundos y reservá con el 30% de seña. Sin llamadas, sin esperar respuesta.
        </p>
        <a href="/cotizar" className="btn-primary" style={{ fontSize: 14, padding: '18px 48px', display: 'inline-block', textDecoration: 'none' }}>
          Ver precio al instante →
        </a>
      </section>

      <style>{`
        .section-tag {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 500; letter-spacing: 0.15em;
          text-transform: uppercase; color: #999; margin-bottom: 20px;
        }
        @media (max-width: 768px) {
          section { padding: 60px 20px !important; }
          .sala-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Layout>
  )
}
