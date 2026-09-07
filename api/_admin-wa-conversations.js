/**
 * POST /api/admin-wa-conversations  (Authorization: Bearer <token de sesión>)
 * body: { status?: 'all'|'active'|'qualified'|'closed' }
 *
 * Conversaciones del bot de WhatsApp para el panel de administración.
 * Respuesta: { conversations:[...] } ordenadas por updated_at desc (máx. 500).
 */
import { handleOptions, json, error, safeError, parseBody, requireAdmin, supabaseAdmin } from './_utils.js'

const CONVERSATION_STATUSES = ['active', 'qualified', 'closed']
const LIMIT = 500
/** PostgREST (tabla no está en el schema cache) / Postgres (undefined_table). */
const MISSING_TABLE_CODES = ['PGRST205', '42P01']

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return error(res, 'Method not allowed', 405)
  }

  const auth = await requireAdmin(req)
  if (!auth.ok) return error(res, auth.message, auth.status)

  const body = parseBody(req)
  // La contraseña sólo se acepta en /api/admin-auth; acá va el token de sesión.
  if (Object.hasOwn(body, 'password')) return error(res, 'Usá el token de sesión (Authorization: Bearer), no la contraseña', 400)

  const status = typeof body.status === 'string' && body.status.trim() ? body.status.trim() : 'all'
  if (status !== 'all' && !CONVERSATION_STATUSES.includes(status)) return error(res, 'Filtro de estado inválido', 400)

  try {
    let query = supabaseAdmin()
      .from('whatsapp_conversations')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(LIMIT)
    if (status !== 'all') query = query.eq('status', status)

    const { data, error: dbErr } = await query
    if (dbErr) {
      if (MISSING_TABLE_CODES.includes(dbErr.code)) {
        console.error('[admin-wa-conversations] la tabla whatsapp_conversations no existe: falta correr la migración de fase A')
        return error(res, 'Las conversaciones de WhatsApp todavía no están habilitadas en la base de datos (falta la migración).', 503)
      }
      throw dbErr
    }

    return json(res, { conversations: data || [] })
  } catch (err) {
    return safeError(res, 'admin-wa-conversations', err, 'No pudimos cargar las conversaciones. Intentá de nuevo.')
  }
}
