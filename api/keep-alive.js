import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { error } = await supabase.from('blocked_dates').select('id').limit(1)
  if (error) {
    console.error('[keep-alive] Supabase error:', error.message)
    return res.status(500).json({ ok: false, error: error.message })
  }
  console.log('[keep-alive] Supabase ping OK', new Date().toISOString())
  return res.status(200).json({ ok: true, ts: new Date().toISOString() })
}
