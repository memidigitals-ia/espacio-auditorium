/**
 * Shared utilities for Vercel API routes
 */

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.VITE_APP_URL || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
}

export function handleOptions(req, res) {
  if (req.method === 'OPTIONS') {
    cors(res)
    res.status(200).end()
    return true
  }
  return false
}

export function json(res, data, status = 200) {
  cors(res)
  res.status(status).json(data)
}

export function error(res, message, status = 500) {
  cors(res)
  res.status(status).json({ error: message })
}
