import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Component } from 'react'
import HomePage from './pages/HomePage'
import BookingPage from './pages/BookingPage'
import PaymentStatusPage from './pages/PaymentStatusPage'
import AdminPage from './pages/AdminPage'
import SalasPage from './pages/SalasPage'
import CotizarPage from './pages/CotizarPage'
import ConferenciasPage from './pages/ConferenciasPage'
import CapacitacionesPage from './pages/CapacitacionesPage'
import PodcastStreamingPage from './pages/PodcastStreamingPage'
import LanzamientosPage from './pages/LanzamientosPage'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0a0a0a' }}>
          <div style={{ maxWidth: 600, width: '100%' }}>
            <h2 style={{ color: '#ef9a9a', marginBottom: '1rem' }}>Error al cargar la página</h2>
            <pre style={{ background: '#1a1a1a', padding: '1rem', borderRadius: '8px', color: '#f0f0f0', fontSize: '0.8rem', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {this.state.error?.message}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
            <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#c8900a', color: '#000', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              Recargar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#f0f0f0',
            border: '1px solid #333',
            fontFamily: 'var(--font-sans)',
            fontSize: '0.9rem',
          },
          success: { iconTheme: { primary: '#c8900a', secondary: '#0a0a0a' } },
          error: { iconTheme: { primary: '#e05555', secondary: '#f0f0f0' } },
        }}
      />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/reservar" element={<BookingPage />} />
        <Route path="/pago" element={<PaymentStatusPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/salas" element={<SalasPage />} />
        <Route path="/cotizar" element={<CotizarPage />} />
        <Route path="/conferencias" element={<ConferenciasPage />} />
        <Route path="/capacitaciones" element={<CapacitacionesPage />} />
        <Route path="/podcast-y-streaming" element={<PodcastStreamingPage />} />
        <Route path="/lanzamientos" element={<LanzamientosPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  )
}

function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem' }}>
      <div>
        <p style={{ fontSize: '5rem', fontFamily: 'var(--font-serif)', color: 'var(--gold)', marginBottom: '1rem' }}>404</p>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>Página no encontrada</h1>
        <a href="/" className="btn btn-outline">Volver al inicio</a>
      </div>
    </div>
  )
}
