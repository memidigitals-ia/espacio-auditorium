-- Tabla para guardar el historial de conversaciones de WhatsApp
-- Ejecutar en Supabase SQL Editor

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
  phone        TEXT PRIMARY KEY,
  messages     JSONB NOT NULL DEFAULT '[]',
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para limpiezas periódicas (conversaciones viejas)
CREATE INDEX IF NOT EXISTS idx_whatsapp_updated_at ON whatsapp_conversations (updated_at);
