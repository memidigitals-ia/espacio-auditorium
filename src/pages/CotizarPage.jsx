import { Helmet } from 'react-helmet-async'
import Layout from '../components/Layout'

export default function CotizarPage() {
  return (
    <Layout>
      <Helmet>
        <title>Cotizá tu Auditorio Online — Precio Instantáneo | Espacio Auditorium</title>
        <meta name="description" content="Elegí fecha, duración y horario y ves el precio al instante. Sin llamadas, sin esperas. Reservá con el 30% por Mercado Pago y bloqueá tu fecha. Auditorio en Recoleta, CABA." />
        <link rel="canonical" href="https://www.espacioauditorium.com.ar/cotizar" />
        <meta property="og:title" content="Cotizá Online — Precio Instantáneo | Espacio Auditorium" />
        <meta property="og:description" content="Cotizador self-service. Elegís fecha, ves precio al instante y reservás con el 30%. Sin llamadas. Recoleta, CABA." />
        <meta property="og:url" content="https://www.espacioauditorium.com.ar/cotizar" />
      </Helmet>

      {/* Hero */}
      <section style={{ background: 'var(--warm-white)', padding: '80px 80px 60px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 500, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 32 }}>
          <span style={{ display: 'block', width: 32, height: 1, background: 'var(--gold)' }} />
          Cotizador online
        </span>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(40px, 5vw, 60px)', fontWeight: 400, lineHeight: 1.1, color: 'var(--black)', marginBottom: 24 }}>
          Precio al instante.<br /><em style={{ color: 'var(--gold)', fontStyle: 'italic' }}>Sin llamadas.</em>
        </h1>
        <p style={{ fontSize: 17, fontWeight: 300, color: '#666', maxWidth: 520, lineHeight: 1.75, marginBottom: 48 }}>
          Elegís fecha, duración y horario — el precio aparece al instante. Reservás con el 30% de seña por Mercado Pago y la fecha queda bloqueada.
        </p>

        {/* Pasos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, maxWidth: 900 }}>
          {[
            { num: '01', title: 'Elegís fecha y duración', desc: 'Seleccionás en el cotizador la fecha de tu evento, la duración (media jornada, jornada completa o más días) y el horario de inicio.' },
            { num: '02', title: 'Ves el precio al instante', desc: 'Sin esperar respuesta ni cotización manual. El precio total y la seña del 30% aparecen inmediatamente en pantalla.' },
            { num: '03', title: 'Reservás con la seña', desc: 'Completás el formulario y abonás el 30% por Mercado Pago. La fecha queda bloqueada y el precio congelado.' },
          ].map(step => (
            <div key={step.num} style={{ padding: '40px 36px', background: 'white', border: '1px solid var(--gray-light)' }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 48, fontWeight: 400, color: 'var(--gray-light)', display: 'block', lineHeight: 1, marginBottom: 20 }}>{step.num}</span>
              <h3 style={{ fontSize: 15, fontWeight: 500, color: 'var(--black)', marginBottom: 10 }}>{step.title}</h3>
              <p style={{ fontSize: 14, color: '#777', fontWeight: 300, lineHeight: 1.65 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Detalles del cotizador */}
      <section style={{ background: 'var(--off-white)', padding: '80px 80px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.2, marginBottom: 20 }}>
              Opciones disponibles
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Media jornada', desc: '4 horas · turno mañana o tarde' },
                { label: 'Jornada completa', desc: '8 horas · el día entero' },
                { label: 'Jornada + extensión', desc: 'Hasta 12 horas en un solo día' },
                { label: '2 días completos', desc: 'Para eventos que se extienden' },
                { label: '3 días completos', desc: 'Formaciones o congresses' },
                { label: '4+ días  🔥 -15%', desc: 'Con 15% de descuento automático' },
              ].map((opt, i) => (
                <div key={opt.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '18px 0', borderBottom: '1px solid var(--gray-light)',
                }}>
                  <div>
                    <span style={{ fontSize: 15, fontWeight: 500, color: 'var(--black)' }}>{opt.label}</span>
                    <span style={{ display: 'block', fontSize: 13, color: '#999', marginTop: 2 }}>{opt.desc}</span>
                  </div>
                  <span style={{ fontSize: 20, color: 'var(--gold)' }}>→</span>
                </div>
              ))}
            </ul>
          </div>
          <div style={{ background: 'var(--black)', padding: '48px 40px', borderRadius: 4 }}>
            <span style={{ fontSize: 11, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 24, display: 'block' }}>Lo que incluye</span>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                'Sala Gaudi (auditorio 36p) + Sala Pollock (12p) + Sala Miró (15p)',
                'Proyector HDMI en Sala Gaudi',
                'TV 42" HDMI en Pollock y Miró',
                'WiFi 100MB simétrico',
                'Aire acondicionado',
                'Rotafolio y marcadores',
                '30 min de armado previo incluidos',
              ].map(item => (
                <li key={item} style={{ display: 'flex', gap: 12, fontSize: 14, color: '#ccc', lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--gold)', flexShrink: 0, marginTop: 2 }}>✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Condiciones */}
      <section style={{ background: 'var(--warm-white)', padding: '80px 80px' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 400, color: 'var(--black)', lineHeight: 1.2, marginBottom: 48, textAlign: 'center' }}>
          Condiciones de reserva
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
          {[
            { titulo: 'Seña del 30%', texto: 'Con el 30% del total reservás la fecha y el precio queda congelado. Se abona por Mercado Pago (tarjeta, transferencia o débito).' },
            { titulo: 'Saldo 5 días antes', texto: 'El 70% restante se abona hasta 5 días antes del evento. Sin sorpresas ni costos adicionales.' },
            { titulo: 'Cancelación', texto: 'La seña no es reembolsable pero podés reprogramar con 7+ días de anticipación. El saldo (70%) es 100% reembolsable si cancelás antes de los 5 días.' },
          ].map(c => (
            <div key={c.titulo} style={{ padding: '48px 40px', background: 'white', border: '1px solid var(--gray-light)' }}>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 400, color: 'var(--black)', marginBottom: 16 }}>{c.titulo}</h3>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.75, fontWeight: 300 }}>{c.texto}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: 'var(--gold)', padding: '80px 80px', textAlign: 'center' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(32px, 4vw, 48px)', fontWeight: 400, color: 'var(--black)', marginBottom: 20 }}>
          ¿Lista tu fecha?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(0,0,0,0.6)', fontWeight: 300, maxWidth: 440, margin: '0 auto 40px' }}>
          Cotizá en el cotizador, completá el formulario y reservá. En menos de 5 minutos tenés tu evento agendado.
        </p>
        <a href="/reservar" className="btn-primary" style={{ fontSize: 14, padding: '18px 48px', display: 'inline-block', textDecoration: 'none' }}>
          Ir al cotizador →
        </a>
      </section>

      <style>{`
        @media (max-width: 768px) {
          section { padding: 60px 20px !important; }
          .cotizar-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </Layout>
  )
}
