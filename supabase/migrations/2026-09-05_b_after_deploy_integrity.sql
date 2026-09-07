-- ============================================================
-- ESPACIO AUDITORIUM — Migración de seguridad, FASE B
-- Ejecutar DESPUÉS de desplegar el código nuevo (el frontend nuevo ya no
-- consulta Supabase directamente: usa /api/availability).
-- Ejecutar completa en Supabase > SQL Editor (proyecto wxjytqjwoarmqvceyvqj).
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. Cerrar por completo el acceso público a la base (la web ya no lo usa)
-- ------------------------------------------------------------
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
DROP POLICY IF EXISTS "Public can read availability"  ON public.reservations;
DROP POLICY IF EXISTS "Public can read blocked dates" ON public.blocked_dates;

-- ------------------------------------------------------------
-- 2. Estados nuevos que el código escribe (antes 'refunded' violaba el CHECK)
-- ------------------------------------------------------------
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_status_check;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_status_check
  CHECK (status IN (
    'pending_payment',   -- creada, esperando seña (hold de 2 h)
    'deposit_paid',      -- seña acreditada
    'confirmed',         -- saldo pago / confirmada por admin
    'cancelled',         -- cancelada (ver cancel_reason)
    'refunded',          -- seña devuelta o contracargo
    'payment_conflict',  -- pagó pero la fecha ya estaba tomada: hay que devolver
    'expired'            -- hold vencido sin pago
  ));

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS cancel_reason        TEXT,            -- 'admin' | 'auto' | 'refunded' | 'charged_back' | 'conflict'
  ADD COLUMN IF NOT EXISTS coupon_code          TEXT,
  ADD COLUMN IF NOT EXISTS coupon_discount_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS calendar_sync_error  TEXT,            -- último error al crear/borrar el evento
  ADD COLUMN IF NOT EXISTS mp_transaction_amount NUMERIC(12,2),  -- monto realmente cobrado por MP
  ADD COLUMN IF NOT EXISTS client_ip            TEXT,
  ADD COLUMN IF NOT EXISTS public_token         TEXT;            -- token aleatorio para /api/reservations/:id

-- ------------------------------------------------------------
-- 3. Límites de tamaño (contra llenado de la base) y coherencia de fechas
--    NOT VALID: no falla si alguna fila vieja no cumple; se valida aparte.
-- ------------------------------------------------------------
ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_field_lengths;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_field_lengths CHECK (
    char_length(first_name) <= 80
    AND char_length(last_name) <= 80
    AND char_length(email) <= 254
    AND char_length(whatsapp) <= 30
    AND char_length(event_type) <= 80
    AND char_length(COALESCE(notes, '')) <= 1000
  ) NOT VALID;

ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_dates_check;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_dates_check CHECK (
    end_date >= start_date
    AND (end_date - start_date) <= 60
  ) NOT VALID;

DO $$
BEGIN
  ALTER TABLE public.reservations VALIDATE CONSTRAINT reservations_field_lengths;
  ALTER TABLE public.reservations VALIDATE CONSTRAINT reservations_dates_check;
EXCEPTION WHEN check_violation THEN
  RAISE WARNING 'Hay filas viejas que no cumplen los CHECK; quedan NOT VALID (sólo aplican a filas nuevas).';
END $$;

-- ------------------------------------------------------------
-- 4. Anti doble reserva a nivel base de datos
--    Franja como rango entero: mañana=[1,2) tarde=[2,3) día completo=[1,3)
--    Dos reservas pagas no pueden solaparse en fechas Y franja.
-- ------------------------------------------------------------
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS slot_range INT4RANGE
  GENERATED ALWAYS AS (
    CASE slot_type
      WHEN 'half_day_morning'   THEN int4range(1, 2)
      WHEN 'half_day_afternoon' THEN int4range(2, 3)
      ELSE int4range(1, 3)
    END
  ) STORED;

DO $$
BEGIN
  ALTER TABLE public.reservations DROP CONSTRAINT IF EXISTS reservations_no_double_booking;
  ALTER TABLE public.reservations
    ADD CONSTRAINT reservations_no_double_booking
    EXCLUDE USING gist (
      daterange(start_date, end_date, '[]') WITH &&,
      slot_range WITH &&
    )
    WHERE (status IN ('deposit_paid', 'confirmed'));
EXCEPTION WHEN exclusion_violation THEN
  RAISE WARNING 'Ya existen reservas pagas solapadas: resolverlas a mano y volver a correr este bloque.';
END $$;

-- Un pago de Mercado Pago no puede confirmar dos reservas
CREATE UNIQUE INDEX IF NOT EXISTS uq_reservations_mp_payment_id
  ON public.reservations (mp_payment_id)
  WHERE mp_payment_id IS NOT NULL;

-- Índices útiles para las consultas nuevas
CREATE INDEX IF NOT EXISTS idx_reservations_dates_status
  ON public.reservations (start_date, end_date, status);
CREATE INDEX IF NOT EXISTS idx_reservations_pending_created
  ON public.reservations (created_at) WHERE status = 'pending_payment';

-- ------------------------------------------------------------
-- 5. blocked_dates: motivo opcional, índice por fecha+franja
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_blocked_dates_date_slot ON public.blocked_dates (date, slot_type);

-- ------------------------------------------------------------
-- 6. Limpieza automática de tablas de soporte (pg_cron, si está habilitado)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('purge_rate_limits', '17 4 * * *',
      $cron$DELETE FROM public.api_rate_limits WHERE created_at < NOW() - INTERVAL '2 days';
            DELETE FROM public.admin_login_attempts WHERE created_at < NOW() - INTERVAL '2 days';$cron$);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron no disponible; el backend limpia estas tablas de forma oportunista.';
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
