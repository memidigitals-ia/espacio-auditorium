-- ============================================================
-- ESPACIO AUDITORIUM — Schema de Supabase
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLA: reservations
-- ============================================================
CREATE TABLE IF NOT EXISTS reservations (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Datos del cliente
  first_name          TEXT NOT NULL,
  last_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  whatsapp            TEXT NOT NULL,
  event_type          TEXT NOT NULL,
  notes               TEXT DEFAULT '',

  -- Fechas y horario
  start_date          DATE NOT NULL,
  end_date            DATE NOT NULL,
  duration_type       TEXT NOT NULL CHECK (duration_type IN ('half_day', 'full_day')),
  slot_type           TEXT NOT NULL CHECK (slot_type IN ('half_day_morning', 'half_day_afternoon', 'full_day')),
  additional_hours    INTEGER DEFAULT 0,
  days_count          INTEGER DEFAULT 1,

  -- Precios (en ARS, sin decimales)
  base_price          NUMERIC(12,2) NOT NULL,
  discount_percentage NUMERIC(5,2) DEFAULT 0,
  subtotal_price      NUMERIC(12,2) NOT NULL,
  iva_amount          NUMERIC(12,2) NOT NULL,
  total_price         NUMERIC(12,2) NOT NULL,
  deposit_amount      NUMERIC(12,2) NOT NULL,
  balance_amount      NUMERIC(12,2) NOT NULL,

  -- Estado del proceso
  status              TEXT NOT NULL DEFAULT 'pending_payment'
                        CHECK (status IN ('pending_payment', 'deposit_paid', 'confirmed', 'cancelled')),

  -- Mercado Pago
  mp_preference_id    TEXT,
  mp_payment_id       TEXT,
  deposit_paid_at     TIMESTAMPTZ,

  -- Google Calendar
  calendar_event_id   TEXT,

  -- Política de cancelación
  policy_accepted     BOOLEAN NOT NULL DEFAULT FALSE,
  policy_accepted_at  TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_reservations_start_date ON reservations (start_date);
CREATE INDEX idx_reservations_end_date ON reservations (end_date);
CREATE INDEX idx_reservations_status ON reservations (status);
CREATE INDEX idx_reservations_email ON reservations (email);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER reservations_updated_at
  BEFORE UPDATE ON reservations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TABLA: blocked_dates
-- Permite al admin bloquear fechas manualmente
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_dates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  date        DATE NOT NULL,
  slot_type   TEXT DEFAULT 'full_day'
                CHECK (slot_type IN ('half_day_morning', 'half_day_afternoon', 'full_day')),
  reason      TEXT DEFAULT '',
  created_by  TEXT DEFAULT 'admin'
);

CREATE INDEX idx_blocked_dates_date ON blocked_dates (date);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

-- Habilitar RLS
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;

-- Política: lectura pública de fechas para el calendario (solo columnas necesarias)
-- El frontend anon solo puede ver start_date, end_date, slot_type, status
CREATE POLICY "Public can read availability"
  ON reservations
  FOR SELECT
  USING (status IN ('pending_payment', 'deposit_paid', 'confirmed'));

-- blocked_dates: lectura pública
CREATE POLICY "Public can read blocked dates"
  ON blocked_dates
  FOR SELECT
  USING (true);

-- Solo el service role puede insertar/actualizar reservations
-- (las API routes usan SUPABASE_SERVICE_ROLE_KEY)
CREATE POLICY "Service role full access reservations"
  ON reservations
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access blocked dates"
  ON blocked_dates
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- Realtime: habilitar para disponibilidad en tiempo real
-- ============================================================
-- Ejecutar en Supabase > Database > Replication
-- O usar el SQL:
ALTER PUBLICATION supabase_realtime ADD TABLE reservations;
ALTER PUBLICATION supabase_realtime ADD TABLE blocked_dates;

-- ============================================================
-- Datos de ejemplo (opcional, descomentar para testing)
-- ============================================================
-- INSERT INTO reservations (
--   first_name, last_name, email, whatsapp, event_type,
--   start_date, end_date, duration_type, slot_type,
--   base_price, subtotal_price, iva_amount, total_price, deposit_amount, balance_amount,
--   status, policy_accepted
-- ) VALUES (
--   'Juan', 'Pérez', 'juan@test.com', '+5411987654321', 'Conferencia',
--   CURRENT_DATE + 7, CURRENT_DATE + 7, 'full_day', 'full_day',
--   780000, 780000, 163800, 943800, 283140, 660660,
--   'deposit_paid', true
-- );
