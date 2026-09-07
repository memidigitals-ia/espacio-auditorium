-- ============================================================
-- ESPACIO AUDITORIUM — Migración de seguridad, FASE A (ejecutar YA)
-- Segura de correr ANTES de desplegar el código nuevo:
--   * cierra la fuga de datos personales vía la clave anon (F1)
--   * el frontend viejo sigue funcionando (sólo lee start_date/end_date/slot_type/status)
--   * el panel admin viejo deja de listar reservas hasta el deploy (usa select *)
-- Ejecutar completa en Supabase > SQL Editor (proyecto wxjytqjwoarmqvceyvqj).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. reservations: el rol anon sólo puede leer las 5 columnas de disponibilidad
-- ------------------------------------------------------------
REVOKE ALL PRIVILEGES ON TABLE public.reservations FROM anon, authenticated;
GRANT SELECT (id, start_date, end_date, slot_type, status) ON TABLE public.reservations TO anon;

-- La policy existente sigue filtrando filas (sólo estados activos). La reforzamos
-- para que además sólo muestre reservas de hoy en adelante.
DROP POLICY IF EXISTS "Public can read availability" ON public.reservations;
CREATE POLICY "Public can read availability"
  ON public.reservations
  FOR SELECT
  TO anon
  USING (
    status IN ('pending_payment', 'deposit_paid', 'confirmed')
    AND end_date >= CURRENT_DATE
  );

-- ------------------------------------------------------------
-- 2. blocked_dates: anon sólo lee fecha y franja (no el motivo ni quién bloqueó)
-- ------------------------------------------------------------
REVOKE ALL PRIVILEGES ON TABLE public.blocked_dates FROM anon, authenticated;
GRANT SELECT (id, date, slot_type) ON TABLE public.blocked_dates TO anon;

-- ------------------------------------------------------------
-- 3. Realtime: sacar reservations de la publicación (los cambios de fila
--    incluían datos personales). El sitio nuevo consulta /api/availability.
-- ------------------------------------------------------------
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.reservations;
EXCEPTION WHEN undefined_object OR undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.blocked_dates;
EXCEPTION WHEN undefined_object OR undefined_table THEN NULL;
END $$;

-- ------------------------------------------------------------
-- 4. Columna que el cron payment-reminder necesita desde junio (nunca se aplicó)
-- ------------------------------------------------------------
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS payment_reminder_sent_at TIMESTAMPTZ DEFAULT NULL;

-- ------------------------------------------------------------
-- 5. Tablas de soporte del backend (sólo service_role; RLS sin policies = nadie más)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip          TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_created ON public.admin_login_attempts (ip, created_at);
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.admin_login_attempts FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bucket      TEXT NOT NULL,          -- ej: 'create-payment:ip', 'create-payment:email', 'whatsapp:phone'
  key         TEXT NOT NULL,          -- ip / email / teléfono (hasheado si corresponde)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_lookup ON public.api_rate_limits (bucket, key, created_at);
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.api_rate_limits FROM anon, authenticated;

-- Memoria del bot de WhatsApp (el código la usa desde abril; no existía en este proyecto)
CREATE TABLE IF NOT EXISTS public.whatsapp_conversations (
  phone       TEXT PRIMARY KEY,
  messages    JSONB NOT NULL DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'qualified', 'closed')),
  lead_data   JSONB NOT NULL DEFAULT '{}',
  last_message_sid TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_status     ON public.whatsapp_conversations (status);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_updated_at ON public.whatsapp_conversations (updated_at);
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.whatsapp_conversations FROM anon, authenticated;

-- Por si el proyecto tuviera policies "service role" viejas: no hacen falta
-- (service_role saltea RLS), pero no molestan.

-- ------------------------------------------------------------
-- 6. Privilegios por defecto: que las tablas futuras NO sean públicas
-- ------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

COMMIT;

-- PostgREST cachea el esquema: forzar recarga
NOTIFY pgrst, 'reload schema';

-- Verificación rápida (debe devolver sólo las 5 columnas para anon):
-- SELECT column_name FROM information_schema.column_privileges
--  WHERE table_name = 'reservations' AND grantee = 'anon';
