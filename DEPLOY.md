# Guía de Deploy — Espacio Auditorium

## Requisitos previos
- Cuenta en [Vercel](https://vercel.com)
- Proyecto en [Supabase](https://supabase.com)
- Cuenta de Mercado Pago con acceso a la API
- Google Cloud Service Account con acceso al calendario
- Gmail con App Password configurada

---

## 1. Configurar Supabase

1. Crear un nuevo proyecto en Supabase
2. Ir a **SQL Editor** y ejecutar el contenido de `supabase/schema.sql`
3. En **Settings > API**, copiar:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`
   - `service_role secret key` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 2. Configurar Google Calendar

1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Crear o seleccionar un proyecto
3. Habilitar **Google Calendar API**
4. Crear una **Service Account** (IAM & Admin > Service Accounts)
5. Crear una clave JSON para esa service account
6. Compartir el calendario `espacioauditorium@gmail.com` con el email de la service account (rol: "Hacer cambios en eventos")
7. Convertir el JSON de la service account a una sola línea y usarla en `GOOGLE_SERVICE_ACCOUNT_JSON`

---

## 3. Configurar Mercado Pago

1. Ir a [Mercado Pago Developers](https://www.mercadopago.com.ar/developers)
2. Crear una aplicación
3. Copiar en las variables:
   - `Public Key` → `VITE_MP_PUBLIC_KEY`
   - `Access Token` → `MP_ACCESS_TOKEN`

---

## 4. Configurar Gmail para emails

1. En tu cuenta de Google: Configuración > Seguridad > Verificación en 2 pasos (habilitar)
2. Contraseñas de aplicaciones > Crear nueva > Correo > Otro
3. Copiar la contraseña de 16 caracteres → `EMAIL_APP_PASSWORD`

---

## 5. Configurar WhatsApp (CallMeBot) — opcional

1. Enviar un WhatsApp al +34 644 64 26 07 con el texto: `I allow callmebot to send me messages`
2. Recibirás un apikey → `CALLMEBOT_APIKEY`
3. El número del negocio en formato internacional → `CALLMEBOT_PHONE` (ej: `5491138255877`)

---

## 6. Deploy en Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Desde la carpeta del proyecto
vercel

# Seguir el wizard: link al proyecto, configurar env vars
```

O desde la UI de Vercel:
1. Importar el repositorio de GitHub
2. En **Settings > Environment Variables**, agregar todas las variables del `.env.example`
3. Hacer deploy

### Variables de entorno en Vercel

| Variable | Scope |
|----------|-------|
| `VITE_SUPABASE_URL` | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | Production, Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview |
| `VITE_MP_PUBLIC_KEY` | Production, Preview |
| `MP_ACCESS_TOKEN` | Production, Preview |
| `GOOGLE_CALENDAR_ID` | Production, Preview |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Production, Preview |
| `EMAIL_USER` | Production, Preview |
| `EMAIL_APP_PASSWORD` | Production, Preview |
| `CALLMEBOT_PHONE` | Production, Preview |
| `CALLMEBOT_APIKEY` | Production, Preview |
| `VITE_APP_URL` | Production |
| `ADMIN_PASSWORD` | Production, Preview |

---

## 7. Configurar webhook de Mercado Pago

Después del primer deploy:
1. Ir a MP Developers > Tu aplicación > Webhooks
2. Agregar URL: `https://tu-dominio.vercel.app/api/payment-webhook`
3. Seleccionar eventos: `payment`

---

## 8. Desarrollo local

```bash
# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# Desarrollo con Vercel dev (incluye API routes)
npx vercel dev

# O solo el frontend
npm run dev
```

---

## URL del panel de admin

`https://tu-dominio.vercel.app/admin`

La contraseña se configura en la variable `ADMIN_PASSWORD` (o `VITE_ADMIN_PASSWORD` para expo en dev).
