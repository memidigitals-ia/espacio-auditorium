/**
 * Clientes de Google (Calendar y Sheets) con service account.
 * Usa los paquetes por API (@googleapis/calendar, @googleapis/sheets) en vez del
 * meta-paquete `googleapis` (194 MB) para bajar el cold start.
 *
 * Credenciales, en orden de preferencia:
 *   1. GOOGLE_SERVICE_ACCOUNT_JSON  (JSON completo de la service account en una línea)
 *   2. GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_KEY (private_key con \n escapados)
 */
import { calendar as calendarApi, auth as calendarAuth } from '@googleapis/calendar'
import { sheets as sheetsApi, auth as sheetsAuth } from '@googleapis/sheets'

export const CALENDAR_ID = (process.env.GOOGLE_CALENDAR_ID || '').trim()
export const LEADS_SHEET_ID = (process.env.GOOGLE_LEADS_SHEET_ID || process.env.GOOGLE_SHEET_ID || '').trim()

export const SCOPES = {
  calendarRead: ['https://www.googleapis.com/auth/calendar.readonly'],
  calendarWrite: ['https://www.googleapis.com/auth/calendar'],
  sheets: ['https://www.googleapis.com/auth/spreadsheets'],
}

let _credentials
export function getServiceAccountCredentials() {
  if (_credentials !== undefined) return _credentials
  _credentials = null
  const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim()
  if (raw.startsWith('{')) {
    try {
      _credentials = JSON.parse(raw)
    } catch (err) {
      console.error('[google] GOOGLE_SERVICE_ACCOUNT_JSON no es JSON válido:', err.message)
    }
  }
  if (!_credentials) {
    const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim()
    const key = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').trim()
    if (email && key) {
      _credentials = { type: 'service_account', client_email: email, private_key: key.replace(/\\n/g, '\n') }
    }
  }
  return _credentials
}

export function hasGoogleCredentials() {
  return !!getServiceAccountCredentials()
}

const _authCache = new Map()
function authFor(AuthPlus, scopes) {
  const credentials = getServiceAccountCredentials()
  if (!credentials) throw new Error('Google service account no configurada (GOOGLE_SERVICE_ACCOUNT_JSON)')
  const cacheKey = scopes.join(' ')
  if (!_authCache.has(cacheKey)) {
    _authCache.set(cacheKey, new AuthPlus.GoogleAuth({ credentials, scopes }))
  }
  return _authCache.get(cacheKey)
}

/** @param {'read'|'write'} mode */
export function getCalendarClient(mode = 'read') {
  if (!CALENDAR_ID) throw new Error('GOOGLE_CALENDAR_ID no configurado')
  const scopes = mode === 'write' ? SCOPES.calendarWrite : SCOPES.calendarRead
  return calendarApi({ version: 'v3', auth: authFor(calendarAuth, scopes) })
}

export function getSheetsClient() {
  return sheetsApi({ version: 'v4', auth: authFor(sheetsAuth, SCOPES.sheets) })
}
