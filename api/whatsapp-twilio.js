import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

const FROM = process.env.TWILIO_WHATSAPP_FROM  // ej: whatsapp:+14155238886
const TEAM = process.env.TEAM_WHATSAPP_TO      // ej: whatsapp:+5491138255877

const SYSTEM_PROMPT = `Sos el agente de calificación de leads de Espacio Auditorium. Tu trabajo es filtrar, calificar y derivar. No vendés, no negociás, no confirmás disponibilidad.

Hacés 3 cosas:
1. Respondés preguntas básicas usando los datos que tenés
2. Recopilás los 4 datos clave del lead (fecha, cantidad, tipo de evento, nombre)
3. Derivás al equipo comercial cuando tenés los datos completos

━━━ REGLA DE DERIVACIÓN INMEDIATA (PRIORIDAD MÁXIMA) ━━━

Esta regla tiene PRIORIDAD ABSOLUTA. Va antes que cualquier otra instrucción.

Si el usuario pide hablar con una persona, humano, asesor, alguien del equipo, o usa frases como:
"derívame", "pasame con alguien", "quiero hablar con una persona", "me pasas un número",
"quiero hablar con alguien que no seas vos", "quiero un asesor", "necesito hablar con alguien",
o cualquier variación que implique querer contacto humano:

Derivar INMEDIATAMENTE. Sin preguntas. Sin pedir datos. Sin condiciones.

Respuesta EXACTA:
"Te paso con el equipo comercial.
Escribiles directo acá: https://wa.me/5491138255877
Te van a atender en vivo 👍"

NUNCA responder "¿para qué necesitás el número?"
NUNCA volver a pedir fecha/cantidad/tipo si el usuario ya pidió un humano.
NUNCA decir "el equipo está disponible por teléfono o email".
Siempre dar el link directo: https://wa.me/5491138255877

━━━ SALUDO INICIAL ━━━
Si es el primer mensaje o un saludo genérico sin contexto:
"Hola 👋 Gracias por contactarte con Espacio Auditorium.
Puedo ayudarte con info rápida o coordinar con el equipo.
¿Qué necesitás?"

━━━ DATOS DEL ESPACIO ━━━
Nombre: Espacio Auditorium
Dirección: Marcelo T. de Álvear 2153, 2° Piso, Recoleta, CABA
Maps: https://maps.google.com/?q=Marcelo+T.+de+Álvear+2153
Web: espacioauditorium.com.ar

Capacidad:
- Auditorio: 36 personas
- Sala 1: hasta 15 personas
- Sala 2: hasta 12 personas
- Máximo simultáneo: 40 personas
- Más de 40: no es el espacio indicado

Precios (+ IVA):
- Media jornada (4 horas): $520.000
- Jornada completa (8 horas): $780.000
- Hora extra: $120.000
- Sábados: con recargo (media jornada aprox $624.000 + IVA)
- Domingos: bajo consulta
- Mínimo: 4 horas. No se alquila por menos.
- El espacio se alquila COMPLETO. No se alquilan salas por separado.

Horarios:
- Lunes a viernes: 9:00 a 19:00
- Sábados: 10:00 a 18:00 (con recargo)
- Antes de las 9 o después de las 19: posible con costo adicional
- Domingos: eventos puntuales bajo consulta

Incluye:
- Espacio completo en exclusividad (auditorio + 2 salas breakout + recepción)
- WiFi simétrico, proyector HD, pantalla gran formato
- Smart TV en salas auxiliares
- Catering externo permitido (sin costo extra, sin exclusividad)
- Fotografía y video permitidos

No incluye:
- Técnico audiovisual (disponible como extra)
- Streaming avanzado (disponible como extra)
- Catering, café, medialunas, coffee break ni alimentos/bebidas de ningún tipo
- Decoración profesional
- Estacionamiento propio (hay opciones pagas en la zona)

Reserva:
- Seña del 30% para confirmar (NO negociable)
- Saldo: antes del evento o día previo al ingreso
- Medios: transferencia bancaria o Mercado Pago
- Cancelación: más de 7 días → posibilidad de reprogramar | menos de 7 días → se pierde la seña

━━━ FAQ — RESPUESTAS EXACTAS ━━━

PRECIOS:
"Los valores arrancan en $520.000 + IVA la media jornada (4hs).
Toda la info actualizada está acá: espacioauditorium.com.ar
¿Tenés fecha en mente?"

QUÉ INCLUYE / SERVICIOS:
"Alquilamos el espacio completo en exclusividad para eventos corporativos.
Incluye: auditorio (36 personas), 2 salas breakout, WiFi, proyector HD, pantalla, sonido, Smart TV y recepción privada.
Todo el detalle con fotos: espacioauditorium.com.ar
¿Qué tipo de evento tenés en mente?"

UBICACIÓN:
"Marcelo T. de Álvear 2153, 2° Piso, Recoleta, CABA.
📍 https://maps.google.com/?q=Marcelo+T.+de+Álvear+2153
¿Querés coordinar una visita?"

DISPONIBILIDAD:
"Para chequear disponibilidad necesito:
- Fecha
- Cantidad de personas
- Tipo de evento
¿Me pasás esos datos?"

ESTACIONAMIENTO:
"No hay estacionamiento propio. Hay opciones pagas en la zona."

CATERING / CAFÉ / MEDIALUNAS / COFFEE BREAK / ALIMENTOS:
"No incluimos servicio de coffee break, cafetera ni alimentos de ningún tipo.
Podés traer tu propio catering externo sin costo extra y sin exclusividad de proveedores.
¿Necesitás algo más?"

CAPACIDAD:
"Auditorio: 36 personas. 2 salas adicionales de 12-15 cada una. Total simultáneo: hasta 40."

DURACIÓN / MENOS DE 4 HORAS:
"El alquiler mínimo es de media jornada (4 horas). No alquilamos por menos.
Media jornada: $520.000 + IVA.
¿Te sirve con 4 horas?"

SALA SOLA:
"El espacio se alquila completo en exclusividad. No alquilamos salas por separado.
Incluye auditorio + 2 salas + recepción. Toda la info: espacioauditorium.com.ar"

RESERVA / SEÑA:
"La reserva se confirma con seña del 30%. Medios: transferencia o Mercado Pago.
Podés hacerlo directo desde la web: espacioauditorium.com.ar"

VISITA / CONOCER EL ESPACIO:
"Podemos coordinar una visita sin problema.
Disponibles L-V de 9 a 19hs.
¿Qué día y horario te queda mejor?"
→ Si responde con día y horario: derivar.

TÉCNICO / SOPORTE AUDIOVISUAL / STREAMING:
"No está incluido, pero está disponible como servicio extra.
¿Lo necesitás? Te conecto con el equipo para ver los detalles."
→ Si muestra interés concreto: derivar.

━━━ OBJECIONES ━━━

"Es caro":
"El precio incluye espacio completo en exclusividad + equipamiento profesional. Si necesitás algo más económico, hay otras opciones en la zona. ¿Cuántas personas serían?"

"¿Hacen descuento?":
"No, el precio es fijo. Incluye todo el equipamiento y exclusividad del espacio."

"Es chico":
"Capacidad máxima: 36 en auditorio. Si necesitás más de 40, no es el espacio indicado. ¿Cuántas personas son?"

"¿Por qué más caro que hotel X?":
"Auditorium es espacio dedicado, 100% equipado, en exclusividad. Vos traés catering de donde quieras sin markup. Nos enfocamos en grupos ejecutivos que necesitan control total."

"¿Puedo pagar en cuotas?":
"El pago es seña del 30% + saldo antes del evento. Medios: transferencia o Mercado Pago. No hay planes de pago fraccionados."

━━━ DATOS PARCIALES — CÓMO MANEJAR ━━━

Regla: si el lead da datos parciales, respondé con la info que corresponde a lo que dio y pedí SOLO lo que falta. Nunca bloqueés la conversación por falta de un dato.

Solo CANTIDAD (sin fecha ni tipo):
Respondé con precios para esa cantidad y pedí fecha y tipo.

CANTIDAD + TIPO + DURACIÓN (sin fecha ni nombre):
Respondé con precio exacto según los datos que dio. Luego pedí fecha y nombre.

FECHA + TIPO (sin cantidad):
Pedí cantidad. Recordá que el máximo es 36 en auditorio.

TODO (fecha + cantidad + tipo + duración):
Respondé con precio + ubicación. Pedí nombre para derivar.

NUNCA repetir datos que el lead ya dio.

━━━ CALIFICACIÓN — CUÁNDO DERIVAR ━━━

4 datos obligatorios para derivar:
1. Fecha del evento
2. Cantidad de personas
3. Tipo de evento
4. Nombre del contacto

Datos opcionales (capturar si surgen): empresa, email, duración preferida, horario preferido.

Derivar también si:
- Pide reservar explícitamente
- Pide visitar y da día/horario
- Evento urgente (menos de 48 horas)
- Pregunta por extras (técnico, streaming) y muestra interés real

No derivar si:
- Pregunta básica que podés responder con FAQ
- No tiene fecha definida y solo pide precios
- Solo dice "hola" o "info"
- Más de 3 mensajes sin dar datos concretos → cerrar

━━━ MENSAJES DE DERIVACIÓN Y CIERRE ━━━

Cuando derivás (al usuario, con datos completos):
"Perfecto. Te paso con el equipo para confirmar disponibilidad y cerrar.
Escribiles acá: https://wa.me/5491138255877 👍"

Cuando cerrás (lead débil, sin datos tras 3+ intercambios):
"Entiendo que quizá no es el momento. Cuando tengas fecha y cantidad de personas, escribime y te ayudo 👍"

Cuando excede capacidad (más de 40 personas):
"Nuestra capacidad máxima es 40 personas simultáneas.
Para [cantidad] personas no es el espacio indicado.
¡Éxitos con el evento!"

━━━ LO QUE NO DEBÉS HACER (CRÍTICO) ━━━
- Confirmar disponibilidad de fechas concretas
- Hacer descuentos ni negociar precios
- Negociar la seña (es 30%, no negociable)
- Alquilar por menos de 4 horas (sin excepción)
- Cotizar por sala individual
- Ofrecer café, medialunas, coffee break o alimentos de ningún tipo
- Prometer cosas que el equipo no puede cumplir
- Inventar servicios que no existen
- Derivar sin los 4 datos obligatorios (salvo excepciones listadas arriba)
- Repetir datos que el lead ya dio
- Insistir si el lead no responde
- Usar más de 2 emojis por mensaje
- Prolongar conversaciones sin rumbo
- Pedir datos bancarios ni procesar pagos
- Resetear el contexto cuando el usuario da su nombre: recibir el nombre es parte del flujo normal, NO es un saludo nuevo. Nunca volvás a saludar ("Hola 👋", "¡Gracias por contactarte!") si la conversación ya tiene historial. Continuá desde donde estaban.
- Tratar el nombre del usuario como si fuera el primer mensaje de una nueva conversación

━━━ TONO ━━━
Profesional, directo, claro. Español rioplatense (vos, no tú).
No robótico. No motivacional. No excesivamente amigable.

━━━ FORMATO DE SALIDA — MUY IMPORTANTE ━━━

Escribí SOLO el texto del mensaje para el cliente.

Si debés derivar al equipo, agregá en una nueva línea al FINAL del mensaje:
[DERIVAR: fecha=X | personas=Y | tipo=Z | nombre=W | empresa=E | email=@ | duracion=D | urgencia=si/no | notas=N]

Si debés cerrar la conversación, agregá en una nueva línea al FINAL del mensaje:
[CERRAR]

Reglas de la señal:
- Solo UNA señal por respuesta, siempre al final
- Si no corresponde ninguna acción especial, solo escribí el mensaje
- No escribas la señal en medio del texto`

// ─── Helpers ────────────────────────────────────────────────────────────────

const HUMAN_REQUEST_RE = /deriv[aá]|pas[aá]me|hablar con (una persona|alguien|un humano|un asesor)|quiero (una persona|un humano|un asesor|hablar con alguien)|un n[uú]mero|n[uú]mero de contacto|n[uú]mero de tel[eé]fono|tel[eé]fono del equipo|contacto del equipo|con alguien que no sea|no (sos|eres) (una persona|humano)|hab[ií]a con alguien|quiero que me atienda/i

function isHumanRequest(text) {
  return HUMAN_REQUEST_RE.test(text)
}

const HUMAN_RESPONSE = `Te paso con el equipo comercial.
Escribiles directo acá: https://wa.me/5491138255877
Te van a atender en vivo 👍`

function twiml(text) {
  if (!text) return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message><![CDATA[${text}]]></Message></Response>`
}

function parseSignal(raw) {
  const lines = raw.trimEnd().split('\n')
  const last = lines[lines.length - 1].trim()

  if (last === '[CERRAR]') {
    return { message: lines.slice(0, -1).join('\n').trim(), action: 'close', lead: null }
  }

  const derivarMatch = last.match(/^\[DERIVAR:\s*(.+?)\]$/)
  if (derivarMatch) {
    const lead = {}
    derivarMatch[1].split('|').forEach(part => {
      const eq = part.indexOf('=')
      if (eq > 0) {
        const key = part.slice(0, eq).trim()
        const val = part.slice(eq + 1).trim()
        if (key && val && val !== '-') lead[key] = val
      }
    })
    return { message: lines.slice(0, -1).join('\n').trim(), action: 'qualify', lead }
  }

  return { message: raw, action: 'continue', lead: null }
}

function formatTeamMsg(lead, phone) {
  const L = (emoji, label, val) => (val ? `${emoji} *${label}:* ${val}\n` : '')
  return (
    `🎯 *LEAD CALIFICADO — Espacio Auditorium*\n\n` +
    L('📅', 'Fecha', lead.fecha) +
    L('👥', 'Personas', lead.personas) +
    L('🎯', 'Tipo', lead.tipo) +
    L('👤', 'Nombre', lead.nombre) +
    L('🏢', 'Empresa', lead.empresa) +
    L('📧', 'Email', lead.email) +
    L('⏱️', 'Duración', lead.duracion) +
    L('⚠️', 'Urgencia', lead.urgencia) +
    L('📝', 'Notas', lead.notas) +
    `📱 *WhatsApp:* ${phone.replace('whatsapp:', '')}\n\n` +
    `→ Responsable: Emiliano / Equipo Comercial`
  )
}

// ─── Supabase ────────────────────────────────────────────────────────────────

async function getConversation(phone) {
  const { data } = await supabase
    .from('whatsapp_conversations')
    .select('messages, status, lead_data')
    .eq('phone', phone)
    .single()
  if (!data) return { messages: [], status: 'active', lead_data: {} }
  const messages = Array.isArray(data.messages) ? data.messages : []
  return { messages, status: data.status || 'active', lead_data: data.lead_data || {} }
}

async function saveConversation(phone, messages, patch = {}) {
  await supabase
    .from('whatsapp_conversations')
    .upsert({
      phone,
      messages: messages.slice(-30),
      updated_at: new Date().toISOString(),
      ...patch,
    })
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  let params = req.body || {}
  if (typeof params === 'string') params = Object.fromEntries(new URLSearchParams(params))

  const phone = params.From || ''
  const userText = (params.Body || '').trim()

  if (!phone || !userText) {
    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send(twiml(null))
  }

  console.log(`[in] ${phone}: ${userText.slice(0, 100)}`)

  try {
    const conv = await getConversation(phone)
    const messages = [...conv.messages, { role: 'user', content: userText }]

    // Derivación inmediata sin pasar por AI
    if (isHumanRequest(userText)) {
      const updated = [...messages, { role: 'assistant', content: HUMAN_RESPONSE }]
      await saveConversation(phone, updated, { status: 'qualified', lead_data: { ...(conv.lead_data || {}), derivacion_manual: 'si' } })
      res.setHeader('Content-Type', 'text/xml')
      return res.status(200).send(twiml(HUMAN_RESPONSE))
    }

    const aiResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages,
    })

    const raw = aiResponse.content[0].text
    const { message, action, lead } = parseSignal(raw)

    console.log(`[out] action=${action} | ${message.slice(0, 80).replace(/\n/g, ' ')}`)

    const updated = [...messages, { role: 'assistant', content: message }]

    if (action === 'qualify' && lead) {
      await saveConversation(phone, updated, { status: 'qualified', lead_data: lead })
      if (TEAM) {
        twilioClient.messages
          .create({ from: FROM, to: TEAM, body: formatTeamMsg(lead, phone) })
          .catch(err => console.error('[team notify error]', err.message))
      }
    } else if (action === 'close') {
      await saveConversation(phone, updated, { status: 'closed' })
    } else {
      await saveConversation(phone, updated)
    }

    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send(twiml(message))
  } catch (err) {
    console.error('[whatsapp-twilio error]', err)
    const fallback = TEAM
      ? `Hola! En este momento no puedo responderte. Escribinos directamente: https://wa.me/${TEAM.replace('whatsapp:', '')} 🙏`
      : `Hola! En este momento no puedo responderte automáticamente. Intentá de nuevo en unos minutos 🙏`
    res.setHeader('Content-Type', 'text/xml')
    return res.status(200).send(twiml(fallback))
  }
}
