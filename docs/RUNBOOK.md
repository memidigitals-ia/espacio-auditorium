# Runbook de operación — Espacio Auditorium

Cómo se opera el sitio día a día. Para deploy ver `../DEPLOY.md`; para incidentes de
seguridad y rotación de secretos ver `../SECURITY.md`.

---

## 1. Rutina

| Frecuencia | Tarea | Dónde |
|------------|-------|-------|
| Diaria | Revisar reservas nuevas y pendientes | `/admin` (filtros *Pendientes* / *Seña pagada*) |
| Diaria | Ver que los 4 crons terminaron en 200 | Vercel > Project > Cron Jobs |
| Diaria | Leads del bot | `/admin` > WhatsApp, y planilla de leads |
| Semanal | Backup de la base (`SECURITY.md` §5) | terminal |
| Semanal | Errores en runtime | Vercel > Logs (filtro *error*) |
| Mensual | `npm run audit:prod` y `npm outdated` en un branch | terminal |
| Mensual | Uso de Vercel / Supabase / Anthropic / Twilio | paneles de cada servicio |

---

## 2. Estados de una reserva

| Estado | Significa | Bloquea la fecha |
|--------|-----------|------------------|
| `pending_payment` | creada, esperando la seña (hold de **2 h**, igual que la preferencia de MP) | sí, durante el hold |
| `deposit_paid` | seña acreditada; evento creado en Google Calendar; emails enviados | sí |
| `confirmed` | saldo pagado / confirmada por el negocio | sí |
| `cancelled` | cancelada por admin o por auto-cancel (`cancel_reason`) | no |
| `refunded` | seña devuelta o contracargo (llega por webhook) | no |
| `payment_conflict` | pagó pero la fecha ya estaba tomada o el monto no coincide: **hay que devolver** | no |
| `expired` | hold vencido sin pago | no |

---

## 3. Tareas frecuentes

### Bloquear una fecha (evento propio, mantenimiento)
`/admin` > *Bloquear fechas* > fecha (o rango) + franja (mañana / tarde / día completo) + motivo.
También sirve cargar un evento en Google Calendar: cualquier evento **con hora** que pise
07:00–14:00 bloquea la mañana y 13:00–23:00 la tarde; un evento de **día completo** bloquea
todo. Los eventos *transparentes* ("disponible") y los cancelados se ignoran.

### Cancelar una reserva
`/admin` > reserva > *Cancelar*. Borra el evento de Calendar (el resultado se muestra:
`deleted` / `already_gone` / `failed`) y marca `cancelled`. **No reembolsa**: el reembolso se
hace en Mercado Pago > Actividad > pago > Reembolsar.

### Reembolsar
Mercado Pago > Actividad > buscar por email o `mp_payment_id` (visible en `/admin`) >
Reembolsar. El webhook recibe el cambio y pasa la reserva a `refunded`, libera la fecha y
avisa al negocio.

### Cliente que pagó y sigue "pendiente"
Ver `SECURITY.md` §4.2 (webhook). Nunca marcar a mano como pagada sin ver el pago aprobado
en MP.

### Cambiar precios o la política de cancelación
Un solo archivo: `src/lib/pricing.js`. Lo usan el sitio, el cotizador, `create-payment`, los
emails y el bot. Deploy por `git push`.

### Cupones
Variable `COUPON_CODES` en Vercel, JSON `{"CODIGO": porcentaje}` (descuento sobre la seña).
Redeploy para que tome efecto.

### Cambiar la contraseña del admin
`ADMIN_PASSWORD` en Vercel + Redeploy. Cerrar sesiones: cambiar también `ADMIN_SESSION_SECRET`.

---

## 4. Dónde mirar cuando algo falla

| Síntoma | Mirar |
|---------|-------|
| El calendario de `/reservar` no muestra bloqueos o *Continuar* deshabilitado | `GET /api/availability` → si 503, Google Calendar no responde (credenciales, quota, calendario no compartido con la service account) |
| Pago aprobado sin confirmación | MP > Webhooks > historial; Vercel > Logs `[payment-webhook]` |
| No llegan emails | Vercel > Logs `[email]`; App Password vencida; cuota diaria de Gmail (~500) |
| El bot no contesta | Vercel > Logs `[whatsapp-twilio]`; Twilio > Monitor > Errors (11200 = nuestro endpoint falló) |
| Cron en rojo | Vercel > Cron Jobs > ver respuesta; 401 = `CRON_SECRET` falta |
| Panel admin devuelve 401 tras un rato | el token dura 12 h: volver a loguearse |
| `/admin` no lista reservas | migración Fase A/B pendiente o `SUPABASE_SERVICE_ROLE_KEY` rotada sin actualizar |

Logs de Vercel (plan Hobby) se conservan ~1 h: ante un error, capturarlo enseguida.

---

## 5. Contactos y paneles

| Servicio | Panel | Para qué |
|----------|-------|----------|
| Vercel | vercel.com > proyecto `espacio-auditorium` | deploys, logs, env vars, crons, firewall |
| Supabase | supabase.com > proyecto `wxjytqjwoarmqvceyvqj` | SQL Editor, logs, API keys |
| Mercado Pago | mercadopago.com.ar/developers y panel de Actividad | credenciales, webhooks, reembolsos |
| Google Cloud | console.cloud.google.com | service account y APIs de Calendar/Sheets |
| Twilio | console.twilio.com | sender de WhatsApp, webhook, errores |
| Anthropic | console.anthropic.com | API key y consumo del bot |
| GitHub | github.com/memidigitals-ia/espacio-auditorium | código; push a `main` = deploy |
