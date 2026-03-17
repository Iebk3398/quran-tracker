-- Migration: Ajout de la table hizb_daily_log
-- Permet de suivre les hizbs lus par utilisateur par jour
-- Un seul enregistrement par (user_id, date) via UNIQUE constraint

CREATE TABLE IF NOT EXISTS "hizb_daily_log" (
  "id"         TEXT        PRIMARY KEY,
  "user_id"    TEXT        NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date"       TEXT        NOT NULL,  -- format YYYY-MM-DD
  "count"      INTEGER     NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("user_id", "date")
);

CREATE INDEX IF NOT EXISTS "hizb_daily_user_idx" ON "hizb_daily_log"("user_id");
CREATE INDEX IF NOT EXISTS "hizb_daily_date_idx" ON "hizb_daily_log"("date");
