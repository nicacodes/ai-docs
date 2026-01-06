-- =============================================================================
-- Script de inicialización de PostgreSQL para AI Docs
-- =============================================================================
-- Este script se ejecuta automáticamente al crear el contenedor por primera vez

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Extensiones de PostgreSQL habilitadas: pgcrypto, vector, uuid-ossp';
END $$;
