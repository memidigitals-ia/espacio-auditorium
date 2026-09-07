import { Component } from 'react'

const WA_HREF = 'https://wa.me/5491138255877?text=' + encodeURIComponent('Hola, tuve un problema al usar el sitio web y necesito ayuda.')

// Límite de error genérico: nunca muestra el stack ni el mensaje interno al usuario.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // El detalle va a la consola (y a los logs del navegador), no a la pantalla.
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="app-page" role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 480, width: '100%' }}>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '3rem', color: 'var(--gold)', marginBottom: '0.75rem', lineHeight: 1 }}>Ups</p>
          <h1 style={{ fontSize: '1.4rem', marginBottom: '0.75rem' }}>Algo salió mal al cargar la página</h1>
          <p style={{ color: 'var(--app-muted)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Probá recargar. Si el problema sigue, escribinos por WhatsApp y te ayudamos a reservar.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-gold" onClick={() => window.location.reload()}>
              Recargar
            </button>
            <a href={WA_HREF} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
              Hablar por WhatsApp
            </a>
            <a href="/" className="btn btn-ghost">Volver al inicio</a>
          </div>
        </div>
      </div>
    )
  }
}
