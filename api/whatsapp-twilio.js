import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import twilio from 'twilio'
import { google } from 'googleapis'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

const FROM = process.env.TWILIO_WHATSAPP_FROM  // ej: whatsapp:+14155238886
const TEAM = process.env.TEAM_WHATSAPP_TO      // ej: whatsapp:+5491138255877

const SYSTEM_PROMPT = `Sos el agente de calificación de leads de Espacio Auditorium. Tu trabajo es filtrar, calificar y derivar. No vendés, no negociás, no confirmás disponibilidad.

━━━ PROCESO OBLIGATORIO ANTES DE CADA RESPUESTA ━━━

Antes de escribir cualquier respuesta, revisá el historial completo y extraé en silencio los datos ya provistos:
- Fecha: ¿el usuario mencionó alguna fecha en algún mensaje anterior?
- Cantidad: ¿mencionó cantidad de personas?
- Tipo de evento: ¿mencionó capacitación, reunión, lanzamiento, etc.?
- Nombre: ¿dijo su nombre?
- Duración: ¿mencionó horas o media/jornada completa?

Luego respondé SOLO pidiendo lo que todavía falta. NUNCA preguntes por algo que ya fue respondido en mensajes anteriores, aunque el usuario lo haya dicho de forma casual o en el mismo mensaje con otra cosa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
Si el sistema te dio [SISTEMA: disponibilidad verificada] para esa fecha, usá esa info:
- LIBRE → "El [fecha] está disponible 🟢 Podés reservar directamente acá: https://www.espacioauditorium.com.ar/#reservar"
- OCUPADO → "El [fecha] no está disponible. ¿Tenés otra fecha en mente? El equipo puede ayudarte a encontrar una alternativa."
- MAÑANA_OCUPADA → "La mañana del [fecha] está tomada, pero la tarde está libre. ¿Te sirve la tarde?"
- TARDE_OCUPADA → "La tarde del [fecha] está tomada, pero la mañana está libre. ¿Te sirve la mañana?"

Si el sistema NO te dio info de disponibilidad, respondé:
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
"Claro, podemos coordinar una visita presencial.
Para confirmarla necesitás escribirle por WhatsApp a Sebastián, que es quien gestiona las visitas: https://wa.me/541136447803
Él te va a dar disponibilidad y confirmar el día y horario 👍"

Regla CRÍTICA para visitas:
- NUNCA confirmés ni agendés una visita directamente.
- SIEMPRE derivar al WhatsApp de Sebastián (https://wa.me/541136447803) como paso obligatorio.
- Si el usuario insiste en que le des una fecha o la confirmes vos, recordale que la confirmación SOLO es válida cuando la hace Sebastián.
- Sin ese paso, la visita NO está confirmada bajo ningún concepto.

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

Regla CRÍTICA: revisá TODOS los mensajes anteriores antes de preguntar algo. Si el dato ya fue dado en cualquier mensaje previo, NO lo pidas de nuevo.

Ejemplos de errores que NO debés cometer:
- El usuario dijo "para el 10 de junio" en el mensaje 1 → NO preguntes la fecha en el mensaje 3
- El usuario dijo "20 personas" → NO preguntes "¿cuántas personas?" después
- El usuario dijo "capacitación" → NO preguntes "¿qué tipo de evento?" después
- El usuario dio su empresa → NO preguntes "¿de qué empresa sos?" después
- El usuario dejó su email → NO lo pidas de nuevo

Solo CANTIDAD (sin fecha ni tipo):
Respondé con precios para esa cantidad y pedí fecha y tipo.

CANTIDAD + TIPO + DURACIÓN (sin fecha ni nombre):
Respondé con precio exacto según los datos que dio. Luego pedí fecha y nombre.

FECHA + TIPO (sin cantidad):
Pedí cantidad. Recordá que el máximo es 36 en auditorio.

TODO (fecha + cantidad + tipo + duración):
Respondé con precio + ubicación. Pedí nombre para derivar.

TODO (fecha + cantidad + tipo + nombre) sin empresa ni email:
Respondé brevemente y pedí empresa y email juntos en un mensaje: "Antes de pasarte con el equipo, ¿me decís de qué empresa o institución sos y un mail de contacto?"

NUNCA repetir datos que el lead ya dio en cualquier parte de la conversación.

━━━ CALIFICACIÓN — CUÁNDO DERIVAR ━━━

Datos obligatorios para derivar (los 4 núcleo):
1. Fecha del evento
2. Cantidad de personas
3. Tipo de evento
4. Nombre del contacto

Datos secundarios — pedirlos SIEMPRE antes de derivar si no los tenés:
5. Empresa / organización (preguntá: "¿De qué empresa o institución sos?")
6. Email de contacto (preguntá: "¿Me dejás un mail para que el equipo pueda enviarte la propuesta?")

Datos opcionales (capturar si surgen naturalmente): duración preferida, horario preferido.

Flujo de recolección:
- Primero completá los 4 obligatorios (fecha, personas, tipo, nombre).
- Una vez que los tenés, antes de derivar pedí empresa y email en un mismo mensaje corto.
- Si el contacto no quiere dar empresa o email después de pedirlos una vez, derivá igual con lo que tenés.

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
- Confirmar ni agendar visitas presenciales: siempre derivar al WhatsApp de Sebastián (https://wa.me/541136447803), sin ese paso la visita no existe
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

// ─── Google Sheets ───────────────────────────────────────────────────────────

const firstContactLogged = new Set()

async function getSheetsClient() {
  const sheetId = (process.env.GOOGLE_LEADS_SHEET_ID || '').trim()
  if (!sheetId) return null
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const credentials = saJson && saJson.trim().startsWith('{')
    ? JSON.parse(saJson)
    : {
        type: 'service_account',
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/\\n/g, '\n'),
      }
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
  const sheets = google.sheets({ version: 'v4', auth })
  return { sheets, sheetId }
}

function formatMessages(messages) {
  return messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => `[${m.role === 'user' ? 'Cliente' : 'Agente'}] ${(m.content || '').slice(0, 200)}`)
    .join(' | ')
    .slice(0, 1000)
}

async function logFirstContact(phone, firstMessage) {
  const phoneClean = phone.replace('whatsapp:', '')
  if (firstContactLogged.has(phoneClean)) return
  firstContactLogged.add(phoneClean)

  try {
    const client = await getSheetsClient()
    if (!client) return
    const { sheets, sheetId } = client
    const now = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Leads!A:L',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[now, phoneClean, '', '', '', '', '', '', '', '', 'Primer contacto', firstMessage.slice(0, 500)]] },
    })
    console.log(`[sheets] primer contacto registrado: ${phoneClean}`)
  } catch (err) {
    console.error('[sheets first-contact error]', err.message)
  }
}

async function appendLeadToSheet(lead, phone, messages = []) {
  try {
    const client = await getSheetsClient()
    if (!client) return
    const { sheets, sheetId } = client
    const now = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
    const row = [
      now,
      phone.replace('whatsapp:', ''),
      lead.nombre   || '',
      lead.empresa  || '',
      lead.email    || '',
      lead.fecha    || '',
      lead.personas || '',
      lead.tipo     || '',
      lead.duracion || '',
      lead.urgencia || '',
      lead.notas    || '',
      formatMessages(messages),
    ]
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Leads!A:L',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    })
    console.log(`[sheets] lead calificado guardado: ${phone}`)
  } catch (err) {
    console.error('[sheets error]', err.message)
  }
}

// ─── Availability check ──────────────────────────────────────────────────────

const MESES = { enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6, julio:7, agosto:8, septiembre:9, octubre:10, noviembre:11, diciembre:12 }

function extractDate(text) {
  const t = text.toLowerCase()
  // "10 de junio" / "10 de junio de 2026"
  const m1 = t.match(/(\d{1,2})\s+de\s+([a-záéíóú]+)(?:\s+de\s+(\d{4}))?/)
  if (m1) {
    const day = parseInt(m1[1])
    const month = MESES[m1[2]]
    if (!month) return null
    const year = m1[3] ? parseInt(m1[3]) : new Date().getFullYear()
    const d = new Date(year, month - 1, day)
    if (d < new Date()) d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().split('T')[0]
  }
  // "10/06" / "10/06/2026"
  const m2 = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/)
  if (m2) {
    const day = parseInt(m2[1]), month = parseInt(m2[2])
    const year = m2[3] ? parseInt(m2[3]) : new Date().getFullYear()
    const d = new Date(year, month - 1, day)
    if (d < new Date()) d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().split('T')[0]
  }
  return null
}

async function checkAvailability(dateStr) {
  // Query Supabase reservations
  const { data: reservations } = await supabase
    .from('reservations')
    .select('slot_type, status')
    .eq('start_date', dateStr)
    .in('status', ['pending_payment', 'deposit_paid', 'paid'])

  // Query Google Calendar blocked dates
  let gcalBlocked = []
  try {
    const saEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const saKey   = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '').replace(/\\n/g, '\n')
    if (saEmail && saKey) {
      const auth = new google.auth.GoogleAuth({
        credentials: { type: 'service_account', client_email: saEmail, private_key: saKey },
        scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      })
      const cal = google.calendar({ version: 'v3', auth })
      const dayStart = new Date(dateStr + 'T00:00:00-03:00').toISOString()
      const dayEnd   = new Date(dateStr + 'T23:59:59-03:00').toISOString()
      const resp = await cal.events.list({
        calendarId: process.env.GOOGLE_CALENDAR_ID,
        timeMin: dayStart, timeMax: dayEnd,
        singleEvents: true,
      })
      gcalBlocked = (resp.data.items || []).filter(e =>
        !e.description?.includes('Reserva #') && !e.summary?.includes('[RESERVA]')
      )
    }
  } catch {}

  const activeReservations = reservations || []
  const hasFullDay   = activeReservations.some(r => r.slot_type === 'full_day') || gcalBlocked.some(e => e.start?.date)
  const hasMorning   = activeReservations.some(r => r.slot_type === 'half_day_morning')
  const hasAfternoon = activeReservations.some(r => r.slot_type === 'half_day_afternoon')

  if (hasFullDay || (hasMorning && hasAfternoon)) return 'ocupado'
  if (hasMorning)   return 'mañana_ocupada'
  if (hasAfternoon) return 'tarde_ocupada'
  return 'libre'
}

function availabilityNote(dateStr, status) {
  const [y, m, d] = dateStr.split('-')
  const label = `${d}/${m}/${y}`
  const bookUrl = 'https://www.espacioauditorium.com.ar/#reservar'
  if (status === 'libre')           return `[SISTEMA: disponibilidad verificada para ${label} → LIBRE. Decile que está disponible y envialo a reservar: ${bookUrl}]`
  if (status === 'mañana_ocupada')  return `[SISTEMA: disponibilidad verificada para ${label} → mañana ocupada, tarde libre. Podés ofrecerle la tarde o derivar.]`
  if (status === 'tarde_ocupada')   return `[SISTEMA: disponibilidad verificada para ${label} → tarde ocupada, mañana libre. Podés ofrecerle la mañana o derivar.]`
  return `[SISTEMA: disponibilidad verificada para ${label} → OCUPADO. No está disponible.]`
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

    // Registrar en Sheets: contacto nuevo O reinicio de conversación
    const isNewContact = conv.messages.length === 0
    const isNewSession = ['qualified', 'closed'].includes(conv.status) && conv.messages.length > 0
    if (isNewContact || isNewSession) {
      logFirstContact(phone, userText).catch(err => console.error('[sheets first-contact error]', err.message))
    }
    const messages = [...conv.messages, { role: 'user', content: userText }]

    // Derivación inmediata sin pasar por AI
    if (isHumanRequest(userText)) {
      const updated = [...messages, { role: 'assistant', content: HUMAN_RESPONSE }]
      await saveConversation(phone, updated, { status: 'qualified', lead_data: { ...(conv.lead_data || {}), derivacion_manual: 'si' } })
      res.setHeader('Content-Type', 'text/xml')
      return res.status(200).send(twiml(HUMAN_RESPONSE))
    }

    // Check availability for any date mentioned in current or past messages
    let systemPrompt = SYSTEM_PROMPT
    const allText = messages.map(m => m.content).join(' ')
    const mentionedDate = extractDate(userText) || extractDate(allText)
    if (mentionedDate) {
      try {
        const avail = await checkAvailability(mentionedDate)
        systemPrompt = SYSTEM_PROMPT + '\n\n' + availabilityNote(mentionedDate, avail)
        console.log(`[availability] ${mentionedDate} → ${avail}`)
      } catch (e) {
        console.error('[availability error]', e.message)
      }
    }

    const aiResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
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
      appendLeadToSheet(lead, phone, updated).catch(err => console.error('[sheets error]', err.message))
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
