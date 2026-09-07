import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

const LINKS = [
  { to: '/salas', label: 'Salas' },
  { to: '/conferencias', label: 'Conferencias' },
  { to: '/capacitaciones', label: 'Capacitaciones' },
  { to: '/podcast-y-streaming', label: 'Podcast' },
  { to: '/lanzamientos', label: 'Lanzamientos' },
]

// Navegación del sitio (landing): links de escritorio + menú hamburguesa accesible en mobile.
// Compartida por Layout y HomePage.
export default function Nav() {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const toggleRef = useRef(null)
  const navRef = useRef(null)
  const location = useLocation()

  // Cerrar al navegar
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Escape + click afuera; devolver el foco al botón
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    const onClick = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onClick)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onClick)
    }
  }, [open])

  return (
    <nav ref={navRef} className="site-nav" aria-label="Principal">
      <Link to="/" className="site-nav-logo">
        Espacio <span>Auditorium</span>
      </Link>

      <div className="nav-links">
        {LINKS.map(l => (
          <Link key={l.to} to={l.to} className="nav-link" aria-current={location.pathname === l.to ? 'page' : undefined}>
            {l.label}
          </Link>
        ))}
        <Link to="/reservar" className="nav-cta">Reservar →</Link>
      </div>

      <div className="nav-mobile-actions">
        <Link to="/reservar" className="nav-cta nav-cta-mobile">Reservar</Link>
        <button
          ref={toggleRef}
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setOpen(o => !o)}
        >
          <span className="nav-toggle-bar" aria-hidden="true" />
          <span className="nav-toggle-bar" aria-hidden="true" />
          <span className="nav-toggle-bar" aria-hidden="true" />
        </button>
      </div>

      <div id={menuId} className="nav-mobile-menu" hidden={!open}>
        {LINKS.map(l => (
          <Link key={l.to} to={l.to} className="nav-mobile-link" aria-current={location.pathname === l.to ? 'page' : undefined}>
            {l.label}
          </Link>
        ))}
        <Link to="/cotizar" className="nav-mobile-link">Cotizador</Link>
        <Link to="/reservar" className="nav-mobile-link nav-mobile-link-cta">Reservar fecha →</Link>
      </div>
    </nav>
  )
}
