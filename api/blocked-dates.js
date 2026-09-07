/**
 * GET /api/blocked-dates — alias de compatibilidad de GET /api/availability.
 *
 * Los bundles viejos del frontend (y cualquier integración externa) siguen
 * pegándole a esta ruta. Devuelve exactamente lo mismo que /api/availability:
 * sólo fecha + franjas ocupadas. Sin títulos de eventos, sin datos personales.
 */
import handler from './availability.js'

export default handler
