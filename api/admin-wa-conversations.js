import { createClient } from '@supabase/supabase-js'
import { handleOptions, json, error } from './_utils.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (handleOptions(req, res)) return
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405)

  const { password, status } = req.body || {}

  const adminPassword = (process.env.ADMIN_PASSWORD || '').trim()
  if (!adminPassword || password !== adminPassword) {
    return error(res, 'Unauthorized', 401)
  }

  let query = supabase
    .from('whatsapp_conversations')
    .select('*')
    .order('updated_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data, error: dbError } = await query
  if (dbError) return error(res, dbError.message, 500)

  return json(res, data || [])
}
