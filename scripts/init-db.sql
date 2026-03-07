-- ============================================================
-- 🕌 Quran Tracker — Initialisation base de données
-- ============================================================

-- Extensions PostgreSQL utiles
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- Recherche full-text

-- Créer le schéma applicatif
CREATE SCHEMA IF NOT EXISTS quran;

-- Commentaire sur la base
COMMENT ON DATABASE quran_tracker IS 'Quran Tracker - Suivi mémorisation Coran';
