/**
 * GET /api/keep-alive  (cron diario de Vercel: Authorization: Bearer $CRON_SECRET)
 *
 * Mantiene activo el proyecto de Supabase (plan free pausa por inactividad)
 * con una consulta mínima. Exige el secreto del cron: sin él no se toca la
 * base ni se revela si responde.
 *
 * 200 {ok:true} · 401/500 según checkCronAuth · 500 {error, ref} si la base no responde
 */
import { handleOptions, json, error, safeError, checkCronAuth, supabaseAdmin } from './_utils.js'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS')
    return error(res, 'Method not allowed', 405)
  }

  const auth = checkCronAuth(req)
  if (!auth.ok) return error(res, auth.message, auth.status)

  try {
    const { error: dbErr } = await supabaseAdmin().from('blocked_dates').select('id').limit(1)
    if (dbErr) throw dbErr
    console.log('[keep-alive] Supabase ping OK', new Date().toISOString())
    return json(res, { ok: true })
  } catch (err) {
    return safeError(res, 'keep-alive', err)
  }
}
