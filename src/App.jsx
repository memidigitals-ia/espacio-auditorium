import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import HomePage from './pages/HomePage'
import BookingPage from './pages/BookingPage'
import PaymentStatusPage from './pages/PaymentStatusPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
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
