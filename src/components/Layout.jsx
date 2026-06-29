export default function Layout({ children }) {
  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 48px',
        background: 'rgba(250,248,245,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}>
        <a href="/" style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, letterSpacing: '0.02em', color: 'var(--black)', textDecoration: 'none', flexShrink: 0 }}>
          Espacio <span style={{ color: 'var(--gold)' }}>Auditorium</span>
        </a>
        <div className="nav-links" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
          <a href="/salas" style={navLinkStyle}>Salas</a>
          <a href="/conferencias" style={navLinkStyle}>Conferencias</a>
          <a href="/capacitaciones" style={navLinkStyle}>Capacitaciones</a>
          <a href="/podcast-y-streaming" style={navLinkStyle}>Podcast</a>
          <a href="/lanzamientos" style={navLinkStyle}>Lanzamientos</a>
          <a
            href="/reservar"
            style={{ background: 'var(--black)', color: 'white', padding: '10px 20px', borderRadius: 2, fontSize: 12, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', display: 'inline-block', transition: 'background 0.2s, color 0.2s', flexShrink: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = 'var(--black)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--black)'; e.currentTarget.style.color = 'white' }}
          >
            Reservar →
          </a>
        </div>
      </nav>

      <main style={{ paddingTop: 80 }}>
        {children}
      </main>

      <footer style={{ background: 'var(--black)', padding: '64px 80px 40px', color: '#666' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48, paddingBottom: 48, borderBottom: '1px solid #1e1e1e' }}>
          {/* Brand */}
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, color: 'white', fontWeight: 400, marginBottom: 16 }}>
              Espacio <span style={{ color: 'var(--gold)' }}>Auditorium</span>
            </div>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7, maxWidth: 260, marginBottom: 20 }}>
              Auditorio boutique para eventos íntimos de hasta 36 personas en Recoleta, CABA.
            </p>
            <p style={{ fontSize: 13, color: '#555' }}>
              Marcelo T. de Alvear 2153, 2° Piso<br />
              Recoleta · CABA
            </p>
          </div>

          {/* El espacio */}
          <div>
            <span style={footerHeadStyle}>El espacio</span>
            {[
              { href: '/salas', label: 'Las 3 salas' },
              { href: 'https://my.matterport.com/show/?m=9JaMUZrVdZC', label: 'Tour virtual 360°', external: true },
              { href: '/cotizar', label: 'Cotizador online' },
              { href: '/reservar', label: 'Reservar fecha' },
            ].map(l => <FooterLink key={l.label} {...l} />)}
          </div>

          {/* Para eventos */}
          <div>
            <span style={footerHeadStyle}>Para eventos</span>
            {[
              { href: '/conferencias', label: 'Conferencias' },
              { href: '/capacitaciones', label: 'Capacitaciones' },
              { href: '/podcast-y-streaming', label: 'Podcast y Streaming' },
              { href: '/lanzamientos', label: 'Lanzamientos' },
            ].map(l => <FooterLink key={l.label} {...l} />)}
          </div>

          {/* Contacto */}
          <div>
            <span style={footerHeadStyle}>Contacto</span>
            {[
              { href: 'https://wa.me/5491138255877?text=Hola%2C%20quiero%20info%20sobre%20el%20espacio', label: 'WhatsApp', external: true },
              { href: 'https://www.instagram.com/espacioauditoriumeventos/', label: 'Instagram', external: true },
              { href: 'https://maps.app.goo.gl/5yXfCeKArFk4hwYv8', label: 'Google Maps', external: true },
            ].map(l => <FooterLink key={l.label} {...l} />)}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#444', flexWrap: 'wrap', gap: 8 }}>
          <span>© 2026 Espacio Auditorium · Todos los derechos reservados</span>
          <a href="https://www.emibugliolo.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#555', textDecoration: 'none' }}>
            Desarrollado por emibugliolo.com
          </a>
        </div>
      </footer>

      <a href="https://wa.me/5491138255877?text=Hola%2C%20quiero%20info%20sobre%20el%20espacio" target="_blank" rel="noopener noreferrer" className="whatsapp-float" title="Hablar con alguien del equipo">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>

      <style>{`
        .nav-links a { white-space: nowrap; }
        @media (max-width: 1100px) {
          .nav-links a:not([href="/reservar"]) { display: none; }
          nav { padding: 16px 24px !important; }
        }
        @media (max-width: 768px) {
          footer { padding: 48px 20px 32px !important; }
          footer > div:first-child { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 480px) {
          footer > div:first-child { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  )
}

function FooterLink({ href, label, external }) {
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      style={{ display: 'block', fontSize: 13, color: '#666', textDecoration: 'none', marginBottom: 10, transition: 'color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--gold)'}
      onMouseLeave={e => e.currentTarget.style.color = '#666'}
    >
      {label}
    </a>
  )
}

const navLinkStyle = {
  fontSize: 12, fontWeight: 500, letterSpacing: '0.06em', color: 'var(--black)',
  textDecoration: 'none', textTransform: 'uppercase', transition: 'color 0.2s',
  whiteSpace: 'nowrap',
}

const footerHeadStyle = {
  display: 'block', fontSize: 10, fontWeight: 600, letterSpacing: '0.12em',
  textTransform: 'uppercase', color: '#444', marginBottom: 16,
}
