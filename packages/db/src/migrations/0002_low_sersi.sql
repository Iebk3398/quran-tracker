CREATE TABLE "group_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"created_by_user_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"surah_from" integer,
	"surah_to" integer,
	"target_count" integer,
	"deadline" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "memorization_progress" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "memorization_progress" ALTER COLUMN "status" SET DEFAULT 'not_started'::text;--> statement-breakpoint
DROP TYPE "public"."memorization_status";--> statement-breakpoint
CREATE TYPE "public"."memorization_status" AS ENUM('not_started', 'in_progress', 'memorized');--> statement-breakpoint
ALTER TABLE "memorization_progress" ALTER COLUMN "status" SET DEFAULT 'not_started'::"public"."memorization_status";--> statement-breakpoint
ALTER TABLE "memorization_progress" ALTER COLUMN "status" SET DATA TYPE "public"."memorization_status" USING "status"::"public"."memorization_status";--> statement-breakpoint
ALTER TABLE "group_goals" ADD CONSTRAINT "group_goals_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_goals" ADD CONSTRAINT "group_goals_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_goals_group_idx" ON "group_goals" USING btree ("group_id");