-- Migration: remove 'consolidated' from memorization_status enum
-- Step 1: migrate existing consolidated rows to memorized
UPDATE "memorization_progress" SET "status" = 'memorized' WHERE "status" = 'consolidated';--> statement-breakpoint
-- Step 2: recreate enum without 'consolidated'
ALTER TYPE "public"."memorization_status" RENAME TO "memorization_status_old";--> statement-breakpoint
CREATE TYPE "public"."memorization_status" AS ENUM('not_started', 'in_progress', 'memorized');--> statement-breakpoint
ALTER TABLE "memorization_progress" ALTER COLUMN "status" TYPE "public"."memorization_status" USING "status"::text::"public"."memorization_status";--> statement-breakpoint
DROP TYPE "public"."memorization_status_old";
