/**
 * Server-side admin authentication.
 * Validates against ADMIN_PASSWORD env var (no VITE_ prefix → never bundled into client JS).
 */
import { handleOptions, json, error } from './_utils.js'

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405)

  const { password } = req.body

  if (!password) return error(res, 'Password required', 400)

  const adminPassword = (process.env.ADMIN_PASSWORD || '').trim()
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD env var is not set')
    return error(res, 'Server misconfiguration', 500)
  }

  if (password !== adminPassword) {
    return error(res, 'Unauthorized', 401)
  }

  return json(res, { ok: true })
}
