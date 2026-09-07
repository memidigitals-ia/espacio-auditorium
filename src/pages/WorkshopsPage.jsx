import { Helmet } from 'react-helmet-async'
import CapacitacionesPage from './CapacitacionesPage'

// /workshops: misma propuesta que Capacitaciones, con su propio título/canónica
// (scripts/inject-meta.js ya genera el HTML estático de esta ruta).
export default function WorkshopsPage() {
  return (
    <>
      <CapacitacionesPage />
      <Helmet>
        <title>Sala para Workshops en Recoleta, CABA | Espacio Auditorium</title>
        <meta name="description" content="Espacio flexible para workshops de hasta 36 personas en Recoleta, CABA. 3 salas incluidas, TV HDMI, rotafolio y WiFi. Sin intermediarios, reserva online con precio instantáneo." />
        <link rel="canonical" href="https://www.espacioauditorium.com.ar/workshops" />
        <meta property="og:title" content="Sala para Workshops en Recoleta, CABA | Espacio Auditorium" />
        <meta property="og:url" content="https://www.espacioauditorium.com.ar/workshops" />
      </Helmet>
    </>
  )
}
