-- ============================================================
-- ESPACIO AUDITORIUM — WhatsApp Conversations
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- Tabla base (si no existe)
CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  phone       TEXT PRIMARY KEY,
  messages    JSONB NOT NULL DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'qualified', 'closed')),
  lead_data   JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migración: agregar columnas nuevas si la tabla ya existía
ALTER TABLE whatsapp_conversations
  ADD COLUMN IF NOT EXISTS status     TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS lead_data  JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Constraint de status (idempotente solo en PG 15+; en versiones anteriores ignorar si falla)
DO $$
BEGIN
  ALTER TABLE whatsapp_conversations
    ADD CONSTRAINT wa_conv_status_check CHECK (status IN ('active', 'qualified', 'closed'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_wa_conversations_status     ON whatsapp_conversations (status);
CREATE INDEX IF NOT EXISTS idx_wa_conversations_updated_at ON whatsapp_conversations (updated_at);

-- RLS
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Service role full access whatsapp_conversations"
    ON whatsapp_conversations FOR ALL
    USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
