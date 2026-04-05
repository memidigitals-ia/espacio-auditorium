import { createClient } from '@supabase/supabase-js'
import { handleOptions, json, error } from '../_utils.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (handleOptions(req, res)) return

  const { id } = req.query

  if (req.method === 'GET') {
    const { data, error: err } = await supabase
      .from('reservations')
      .select('*')
      .eq('id', id)
      .single()

    if (err || !data) return error(res, 'Reserva no encontrada', 404)
    return json(res, data)
  }

  return error(res, 'Method not allowed', 405)
}
