/**
 * Utilidades compartidas por todas las API routes (Vercel serverless).
 *
 *  - Cliente Supabase con service role (lazy, único por instancia)
 *  - CORS / respuestas JSON / errores sin filtrar detalles internos
 *  - Rate limiting por clave (tabla api_rate_limits)
 *  - Autenticación de admin: password + token de sesión firmado (HMAC)
 *  - Autenticación de crons (CRON_SECRET, comparación en tiempo constante)
 *  - escapeHtml para todo lo que se interpola en HTML
 *
 * Ningún secreto se loguea ni se devuelve al cliente.
 */
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------
export const PUBLIC_ORIGIN = 'https://www.espacioauditorium.com.ar'
/** URL base del sitio para links en emails, back_urls y notification_url de MP. */
export const APP_URL = (process.env.APP_URL || PUBLIC_ORIGIN).replace(/\/+$/, '')
export { TZ } from './_dates.js'

const ADMIN_WINDOW_MINUTES = 15
const ADMIN_MAX_ATTEMPTS = 5
const ADMIN_TOKEN_TTL_HOURS = 12

// ---------------------------------------------------------------------------
// Env / Supabase
// ---------------------------------------------------------------------------
export function requireEnv(names) {
  const missing = names.filter(n => !process.env[n] || !String(process.env[n]).trim())
  if (missing.length) throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`)
  return Object.fromEntries(names.map(n => [n, String(process.env[n]).trim()]))
}

let _supabase = null
/** Cliente Supabase con service role. Nunca usarlo desde el frontend. */
export function supabaseAdmin() {
  if (_supabase) return _supabase
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Faltan SUPABASE_URL/VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  _supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return _supabase
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------
export function getClientIp(req) {
  // En Vercel x-forwarded-for lo setea la plataforma (el cliente no puede falsificar el primer valor).
  const fwd = req.headers['x-forwarded-for']
  if (fwd) return String(fwd).split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

/** Devuelve siempre un objeto plano, venga JSON, form-urlencoded o string. */
export function parseBody(req) {
  const b = req.body
  if (!b) return {}
  if (typeof b === 'object' && !Buffer.isBuffer(b)) return b
  const s = Buffer.isBuffer(b) ? b.toString('utf8') : String(b)
  const ct = String(req.headers['content-type'] || '')
  if (ct.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(s))
  try { return JSON.parse(s) } catch { return {} }
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', PUBLIC_ORIGIN)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Vary', 'Origin')
}

export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    cors(res)
    res.status(204).end()
    return true
  }
  return false
}

export function json(res, data, status = 200) {
  cors(res)
  if (!res.getHeader('Cache-Control')) res.setHeader('Cache-Control', 'no-store')
  res.status(status).json(data)
}

/** Error "público": el mensaje es apto para mostrar al usuario. */
export function error(res, message, status = 500) {
  cors(res)
  res.setHeader('Cache-Control', 'no-store')
  res.status(status).json({ error: message })
}

/**
 * Error interno: loguea el detalle con un id de referencia y devuelve un
 * mensaje genérico. Nunca expone err.message (Supabase/MP/Google) al cliente.
 */
export function safeError(res, context, err, publicMessage = 'Error interno. Intentá de nuevo en unos minutos.', status = 500) {
  const ref = crypto.randomBytes(4).toString('hex')
  logError(context, err, { ref })
  cors(res)
  res.setHeader('Cache-Control', 'no-store')
  res.status(status).json({ error: publicMessage, ref })
}

export function logError(context, err, extra = {}) {
  const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err)
  console.error(`[${context}]`, detail, Object.keys(extra).length ? JSON.stringify(extra) : '')
}

// ---------------------------------------------------------------------------
// Crypto helpers
// ---------------------------------------------------------------------------
export function constantTimeEqual(a, b) {
  const ba = Buffer.from(String(a ?? ''), 'utf8')
  const bb = Buffer.from(String(b ?? ''), 'utf8')
  if (ba.length !== bb.length) {
    // Comparar igual contra sí mismo para no revelar la longitud por timing
    crypto.timingSafeEqual(ba, ba)
    return false
  }
  return crypto.timingSafeEqual(ba, bb)
}

export function sha256Hex(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex')
}

/** Clave corta y no reversible para usar teléfonos/emails como key de rate limit. */
export function hashKey(v) {
  return sha256Hex(String(v).trim().toLowerCase()).slice(0, 32)
}

export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

// ---------------------------------------------------------------------------
// Rate limiting (tabla api_rate_limits: bucket, key, created_at)
// Falla ABIERTO con warning si la base no responde: preferimos no bloquear
// ventas por un hipo de Supabase; los límites duros están en Vercel WAF.
// ---------------------------------------------------------------------------
export async function checkRateLimit({ bucket, key, max, windowSeconds }) {
  try {
    const db = supabaseAdmin()
    const since = new Date(Date.now() - windowSeconds * 1000).toISOString()
    const { count, error: countErr } = await db
      .from('api_rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('bucket', bucket)
      .eq('key', key)
      .gte('created_at', since)
    if (countErr) throw countErr
    if ((count || 0) >= max) {
      return { allowed: false, remaining: 0, retryAfterSeconds: windowSeconds }
    }
    const { error: insErr } = await db.from('api_rate_limits').insert({ bucket, key })
    if (insErr) throw insErr
    // limpieza oportunista, no bloqueante
    db.from('api_rate_limits').delete().lt('created_at', new Date(Date.now() - 2 * 86400 * 1000).toISOString()).then(() => {}, () => {})
    return { allowed: true, remaining: max - (count || 0) - 1, retryAfterSeconds: 0 }
  } catch (err) {
    logError('rate-limit', err, { bucket })
    return { allowed: true, remaining: max, retryAfterSeconds: 0, degraded: true }
  }
}

// ---------------------------------------------------------------------------
// Admin: password + token de sesión
// ---------------------------------------------------------------------------
function adminSessionSecret() {
  const explicit = (process.env.ADMIN_SESSION_SECRET || '').trim()
  if (explicit) return explicit
  const pwd = (process.env.ADMIN_PASSWORD || '').trim()
  // Derivado del password: cambiar el password invalida todas las sesiones.
  return sha256Hex(`espacio-auditorium:session:${pwd}`)
}

function signAdminPayload(payload) {
  return crypto.createHmac('sha256', adminSessionSecret()).update(payload).digest('base64url')
}

/** Token opaco `v1.<exp>.<firma>` válido ADMIN_TOKEN_TTL_HOURS. */
export function issueAdminToken(ttlHours = ADMIN_TOKEN_TTL_HOURS) {
  const exp = Math.floor(Date.now() / 1000) + ttlHours * 3600
  const payload = `v1.${exp}`
  return { token: `${payload}.${signAdminPayload(payload)}`, expiresAt: new Date(exp * 1000).toISOString() }
}

export function verifyAdminToken(token) {
  if (!token || typeof token !== 'string') return false
  const parts = token.split('.')
  if (parts.length !== 3 || parts[0] !== 'v1') return false
  const exp = Number(parts[1])
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false
  return constantTimeEqual(parts[2], signAdminPayload(`v1.${exp}`))
}

function bearer(req) {
  const h = req.headers['authorization']
  if (!h || typeof h !== 'string') return null
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}

/**
 * Exige `Authorization: Bearer <token de sesión>`.
 * Devuelve { ok } o { ok:false, status, message }.
 */
export async function requireAdmin(req) {
  if (!(process.env.ADMIN_PASSWORD || '').trim()) {
    console.error('ADMIN_PASSWORD no está configurada')
    return { ok: false, status: 500, message: 'Server misconfiguration' }
  }
  const token = bearer(req)
  if (!verifyAdminToken(token)) return { ok: false, status: 401, message: 'Sesión inválida o vencida' }
  return { ok: true }
}

/**
 * Chequeo de password de admin con rate limit por IP (tabla admin_login_attempts).
 * Sólo lo usa /api/admin-auth para emitir el token de sesión.
 */
export async function checkAdminPassword(req, password) {
  const ip = getClientIp(req)
  const since = new Date(Date.now() - ADMIN_WINDOW_MINUTES * 60 * 1000).toISOString()
  let db = null
  try { db = supabaseAdmin() } catch (err) { logError('admin-auth', err) }

  if (db) {
    db.from('admin_login_attempts').delete().lt('created_at', since).then(() => {}, () => {})
    const { count, error: countErr } = await db
      .from('admin_login_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('created_at', since)
    if (countErr) {
      console.error('[admin-auth] No se pudo leer admin_login_attempts (¿falta la migración?):', countErr.message)
    } else if ((count || 0) >= ADMIN_MAX_ATTEMPTS) {
      return { ok: false, status: 429, message: `Demasiados intentos fallidos. Probá de nuevo en ${ADMIN_WINDOW_MINUTES} minutos.` }
    }
  }

  const adminPassword = (process.env.ADMIN_PASSWORD || '').trim()
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD no está configurada')
    return { ok: false, status: 500, message: 'Server misconfiguration' }
  }

  if (!password || typeof password !== 'string' || !constantTimeEqual(password, adminPassword)) {
    if (db) await db.from('admin_login_attempts').insert({ ip }).then(() => {}, () => {})
    console.warn(`[admin-auth] intento fallido desde ${ip}`)
    return { ok: false, status: 401, message: 'Contraseña incorrecta' }
  }
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Crons (Vercel manda `Authorization: Bearer $CRON_SECRET` automáticamente)
// Falla CERRADO si CRON_SECRET no está configurado.
// ---------------------------------------------------------------------------
export function checkCronAuth(req) {
  const secret = (process.env.CRON_SECRET || '').trim()
  if (!secret) {
    console.error('[cron] CRON_SECRET no está configurada: se rechaza la ejecución')
    return { ok: false, status: 500, message: 'Server misconfiguration' }
  }
  const token = bearer(req)
  if (!token || !constantTimeEqual(token, secret)) return { ok: false, status: 401, message: 'Unauthorized' }
  return { ok: true }
}
