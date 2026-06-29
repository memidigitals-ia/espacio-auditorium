// Post-build script: genera un index.html con meta tags únicos por ruta.
// Vercel sirve dist/[ruta]/index.html directamente → Google ve el title correcto sin JS.
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, '..', 'dist')

const routes = [
  {
    path: 'salas',
    title: 'Salas Gaudi, Pollock y Miró — Auditorio Boutique | Espacio Auditorium',
    description: 'Piso completo con 3 salas: Gaudi (36p), Pollock (12p) y Miró (15p). Un único precio incluye todo el espacio. Proyector HDMI, TV 42" y acústica profesional. Recoleta, CABA.',
    canonical: 'https://www.espacioauditorium.com.ar/salas',
  },
  {
    path: 'cotizar',
    title: 'Cotizá tu Auditorio Online — Precio Instantáneo | Espacio Auditorium',
    description: 'Elegí fecha, duración y horario y ves el precio al instante. Sin llamadas, sin esperas. Reservá con el 30% por Mercado Pago y bloqueá tu fecha. Auditorio en Recoleta, CABA.',
    canonical: 'https://www.espacioauditorium.com.ar/cotizar',
  },
  {
    path: 'conferencias',
    title: 'Sala para Conferencias y Charlas en Recoleta, CABA | Espacio Auditorium',
    description: 'Auditorio para conferencias y charlas de hasta 36 personas en Recoleta, CABA. Proyector HDMI, butacas, acústica profesional. Reserva online con precio al instante.',
    canonical: 'https://www.espacioauditorium.com.ar/conferencias',
  },
  {
    path: 'capacitaciones',
    title: 'Sala para Capacitaciones y Workshops en Recoleta, CABA | Espacio Auditorium',
    description: 'Espacio para capacitaciones de hasta 36 personas en Recoleta, CABA. Piso completo con 3 salas incluidas. Proyector, TV y WiFi. Reserva online sin llamadas.',
    canonical: 'https://www.espacioauditorium.com.ar/capacitaciones',
  },
  {
    path: 'podcast-y-streaming',
    title: 'Espacio para Podcast y Streaming en Recoleta, CABA | Espacio Auditorium',
    description: 'Sala con acústica e iluminación profesional para grabación de podcast, streaming en vivo y contenido audiovisual en Recoleta, CABA. Reserva online con precio instantáneo.',
    canonical: 'https://www.espacioauditorium.com.ar/podcast-y-streaming',
  },
  {
    path: 'lanzamientos',
    title: 'Espacio para Lanzamientos de Productos y Programas en CABA | Espacio Auditorium',
    description: 'Venue boutique para lanzamientos de productos, programas y servicios en Recoleta, CABA. Hasta 36 personas, piso completo exclusivo, streaming disponible. Reserva online.',
    canonical: 'https://www.espacioauditorium.com.ar/lanzamientos',
  },
  {
    path: 'workshops',
    title: 'Sala para Workshops en Recoleta, CABA | Espacio Auditorium',
    description: 'Espacio flexible para workshops de hasta 36 personas en Recoleta, CABA. 3 salas incluidas, TV HDMI, rotafolio y WiFi. Sin intermediarios, reserva online con precio instantáneo.',
    canonical: 'https://www.espacioauditorium.com.ar/workshops',
  },
  {
    path: 'reservar',
    title: 'Reservar Auditorio en Recoleta — Precio Instantáneo | Espacio Auditorium',
    description: 'Reservá tu auditorio en Recoleta con el 30% de seña por Mercado Pago. Precio al instante, sin llamadas. 3 salas incluidas para hasta 36 personas. CABA.',
    canonical: 'https://www.espacioauditorium.com.ar/reservar',
  },
]

const template = readFileSync(join(distDir, 'index.html'), 'utf-8')

for (const route of routes) {
  const url = route.canonical
  let html = template

  // Title
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`)

  // Meta description
  html = html.replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${route.description}">`)

  // Canonical
  html = html.replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${url}">`)

  // OG tags
  html = html.replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${url}">`)
  html = html.replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${route.title}">`)
  html = html.replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${route.description}">`)

  // Twitter Card
  html = html.replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${route.title}">`)
  html = html.replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${route.description}">`)

  const outDir = join(distDir, route.path)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, 'index.html'), html)
  console.log(`✓ ${route.path}/index.html → "${route.title.slice(0, 60)}..."`)
}

console.log(`\n✅ Meta injection completa — ${routes.length} rutas generadas.`)
