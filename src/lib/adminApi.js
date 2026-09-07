// Cliente del panel admin: token de sesión en sessionStorage + Bearer en cada llamada.
// Un 401 en cualquier endpoint borra el token y vuelve al login.

export const TOKEN_KEY = 'ea_admin_token'
export const TOKEN_EXP_KEY = 'ea_admin_token_exp'

export class AdminApiError extends Error {
  constructor(message, status, ref) {
    super(message)
    this.name = 'AdminApiError'
    this.status = status
    this.ref = ref
  }
}

export function getToken() {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY)
    const exp = Number(sessionStorage.getItem(TOKEN_EXP_KEY) || 0)
    if (!token || !exp || exp <= Date.now()) {
      clearToken()
      return null
    }
    return token
  } catch {
    return null
  }
}

export function setToken(token, expiresAt) {
  try {
    sessionStorage.setItem(TOKEN_KEY, token)
    const expMs = typeof expiresAt === 'number' ? expiresAt : Date.parse(expiresAt)
    sessionStorage.setItem(TOKEN_EXP_KEY, String(Number.isFinite(expMs) ? expMs : Date.now() + 12 * 3600 * 1000))
  } catch { /* storage bloqueado: la sesión dura lo que dure la página */ }
}

export function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_EXP_KEY)
  } catch { /* nada que limpiar */ }
}

function messageFor(status, body) {
  const serverMsg = typeof body?.error === 'string' && body.error.length < 300 ? body.error : ''
  if (status === 401) return 'Tu sesión venció. Volvé a ingresar.'
  if (status === 429) return serverMsg || 'Demasiados intentos. Esperá unos minutos.'
  if (status === 400) return serverMsg || 'Datos inválidos.'
  if (status === 404) return serverMsg || 'No encontrado.'
  return serverMsg || 'Error del servidor. Intentá de nuevo en unos minutos.'
}

/**
 * POST JSON autenticado. Lanza AdminApiError (status 401 → onUnauthorized ya ejecutado).
 * @param {string} path
 * @param {object} body
 * @param {{ onUnauthorized?: () => void, signal?: AbortSignal }} opts
 */
export async function adminPost(path, body = {}, { onUnauthorized, signal } = {}) {
  const token = getToken()
  if (!token) {
    onUnauthorized?.()
    throw new AdminApiError('Tu sesión venció. Volvé a ingresar.', 401)
  }
  let res
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new AdminApiError('Sin conexión con el servidor.', 0)
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    clearToken()
    onUnauthorized?.()
    throw new AdminApiError(messageFor(401, data), 401)
  }
  if (!res.ok) throw new AdminApiError(messageFor(res.status, data), res.status, data?.ref)
  return data
}

/** Login: devuelve {token, expiresAt} o lanza AdminApiError con mensaje amigable. */
export async function adminLogin(password) {
  let res
  try {
    res = await fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ password }),
    })
  } catch {
    throw new AdminApiError('Sin conexión con el servidor.', 0)
  }
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) throw new AdminApiError('Contraseña incorrecta', 401)
  if (res.status === 429) throw new AdminApiError(messageFor(429, data), 429)
  if (!res.ok || typeof data?.token !== 'string') throw new AdminApiError(messageFor(res.status, data), res.status)
  setToken(data.token, data.expiresAt)
  return data
}
