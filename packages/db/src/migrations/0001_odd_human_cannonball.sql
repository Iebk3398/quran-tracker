ALTER TABLE "users" DROP COLUMN "email_verified";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean NOT NULL DEFAULT false;