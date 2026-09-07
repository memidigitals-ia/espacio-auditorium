/**
 * POST /api/admin-auth  body: { password }
 *
 * Único endpoint que recibe la contraseña de admin. Si es correcta emite un
 * token de sesión firmado (HMAC, 12 h) que el resto de los endpoints admin
 * exigen en `Authorization: Bearer <token>`. La contraseña nunca vuelve a
 * viajar en cada request.
 *
 * Rate limit por IP (tabla admin_login_attempts) y comparación en tiempo
 * constante: ver checkAdminPassword en _utils.js.
 *
 * Respuestas: 200 {ok:true, token, expiresAt} | 400 | 401 {error} | 405 | 429 {error} | 500
 */
import { handleOptions, json, error, safeError, parseBody, checkAdminPassword, issueAdminToken } from './_utils.js'

const MAX_PASSWORD_LENGTH = 256

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS')
    return error(res, 'Method not allowed', 405)
  }

  try {
    const body = parseBody(req)
    const password = typeof body.password === 'string' ? body.password : ''
    if (!password || password.length > MAX_PASSWORD_LENGTH) {
      return error(res, 'Ingresá la contraseña', 400)
    }

    const result = await checkAdminPassword(req, password)
    if (!result.ok) return error(res, result.message, result.status)

    const { token, expiresAt } = issueAdminToken()
    return json(res, { ok: true, token, expiresAt })
  } catch (err) {
    return safeError(res, 'admin-auth', err)
  }
}
