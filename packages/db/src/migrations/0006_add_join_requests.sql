-- Migration: Ajout de la table join_requests
-- Flow de demande d'adhésion : lien partageable → demande → acceptation sheikh → email confirmation

DO $$ BEGIN
  CREATE TYPE "join_request_status" AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "join_requests" (
  "id"         TEXT                   PRIMARY KEY,
  "group_id"   TEXT                   NOT NULL REFERENCES "groups"("id") ON DELETE CASCADE,
  "user_id"    TEXT                   NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status"     "join_request_status"  NOT NULL DEFAULT 'pending',
  "message"    TEXT,
  "created_at" TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  CONSTRAINT "join_requests_group_user_uniq" UNIQUE ("group_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "join_requests_group_idx"  ON "join_requests"("group_id");
CREATE INDEX IF NOT EXISTS "join_requests_status_idx" ON "join_requests"("status");
