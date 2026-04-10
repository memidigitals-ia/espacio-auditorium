import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SYSTEM_PROMPT = `Sos el asistente virtual de Espacio Auditorium, un espacio de eventos y reuniones en Recoleta, Buenos Aires.

Tu objetivo: responder consultas de forma amigable y concisa, y cuando el cliente esté listo para reservar o ver disponibilidad, mandarle el link de la web.

═══ SOBRE EL ESPACIO ═══
Dirección: Marcelo T. de Alvear 2153, 2° Piso, Recoleta, CABA
(Frente a la Facultad de Odontología UBA, a dos cuadras de Medicina)
Subte: Línea D. Múltiples colectivos.
Horario de uso: 8:00 a 22:00 hs todos los días

═══ SALAS (el precio incluye las 3) ═══
• Sala Gaudi: 36 personas, formato auditorio, proyector HDMI, rotafolio
• Sala Pollock: 12 personas, TV 42" HDMI
• Sala Miro: 15 personas, TV 42" HDMI + rotafolio
• Todo el espacio incluye WiFi 100MB y aire acondicionado

═══ PRECIOS (IVA incluido) ═══
• Media jornada (4 hs): $629.200
• Jornada completa (8 hs): $943.800
• Hora adicional: $157.300
• 4 días o más: 15% de descuento automático
• Seña: 30% para confirmar (por Mercado Pago)
• Saldo (70%): hasta 5 días antes del evento

═══ CÓMO RESERVAR ═══
Todo online en https://espacioauditorium.com.ar
Se elige fecha, duración y horario → se paga la seña → confirmación automática.
También hay un recorrido virtual 360° en la web.

═══ REGLAS ═══
- Hablá en español rioplatense (vos, che)
- Mensajes CORTOS: máximo 3-4 líneas
- Usá emojis con moderación (1-2 por mensaje)
- Si preguntan disponibilidad de fechas → la pueden ver en tiempo real en la web
- Cuando el cliente quiera reservar o ver fechas → mandá https://espacioauditorium.com.ar
- Si quieren visita presencial → coordiná (disponible lunes a viernes, horario comercial)
- Nunca inventes información que no tenés

═══ CUÁNDO DERIVAR A UN HUMANO ═══
Si el cliente lo pide explícitamente, tiene un problema con una reserva ya hecha, o la consulta es muy específica y no la podés resolver.
Cuando decidas derivar, terminá tu mensaje con la señal exacta: [DERIVAR_HUMANO]`

async function getHistory(phone) {
  const { data } = await supabase
    .from('whatsapp_conversations')
    .select('messages')
    .eq('phone', phone)
    .single()
  return data?.messages || []
}

async function saveHistory(phone, messages) {
  await supabase
    .from('whatsapp_conversations')
    .upsert({
      phone,
      messages: messages.slice(-20),
      updated_at: new Date().toISOString(),
    })
}

async function reply(phone, userMessage) {
  const history = await getHistory(phone)
  const messages = [...history, { role: 'user', content: userMessage }]

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 350,
    system: SYSTEM_PROMPT,
    messages,
  })

  const botReply = response.content[0].text
  await saveHistory(phone, [...messages, { role: 'assistant', content: botReply }])
  return botReply
}

function twimlResponse(text) {
  // Escapar caracteres especiales XML
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  // Parsear body (Twilio envía form-urlencoded)
  let params = req.body || {}
  if (typeof params === 'string') {
    params = Object.fromEntries(new URLSearchParams(params))
  }

  console.log('twilio webhook body:', JSON.stringify(params))

  // Extraer datos del mensaje entrante
  const phone = params.From   // ej: "whatsapp:+5491136447717"
  const userText = params.Body?.trim()

  if (!phone || !userText) {
    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send('<Response></Response>')
  }

  try {
    const botReply = await reply(phone, userText)

    const humanNumber = process.env.HUMAN_WHATSAPP_NUMBER

    if (botReply.includes('[DERIVAR_HUMANO]')) {
      const cleanReply = botReply.replace('[DERIVAR_HUMANO]', '').trim()
      const extra = humanNumber
        ? `\n\nPodés escribirnos directamente acá 👉 https://wa.me/${humanNumber}`
        : ''
      res.setHeader('Content-Type', 'text/xml')
      return res.status(200).send(twimlResponse(cleanReply + extra))
    }

    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send(twimlResponse(botReply))
  } catch (err) {
    console.error('whatsapp-twilio error:', err)
    const humanNumber = process.env.HUMAN_WHATSAPP_NUMBER
    const fallback = humanNumber
      ? `Hola! En este momento no puedo responderte automáticamente. Escribinos directamente: https://wa.me/${humanNumber} 🙏`
      : `Hola! En este momento no puedo responderte. Intentá de nuevo en unos minutos 🙏`
    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send(twimlResponse(fallback))
  }
}
