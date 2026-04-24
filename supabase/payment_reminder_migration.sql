-- Agregar columna para registrar cuándo se envió el recordatorio de pago
-- Ejecutar en Supabase > SQL Editor

ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS payment_reminder_sent_at TIMESTAMPTZ DEFAULT NULL;
