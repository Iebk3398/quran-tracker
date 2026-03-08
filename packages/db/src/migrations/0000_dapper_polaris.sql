CREATE TYPE "public"."user_role" AS ENUM('super_admin', 'sheikh', 'student', 'parent');--> statement-breakpoint
CREATE TYPE "public"."group_member_role" AS ENUM('sheikh', 'student', 'parent');--> statement-breakpoint
CREATE TYPE "public"."revelation_type" AS ENUM('meccan', 'medinan');--> statement-breakpoint
CREATE TYPE "public"."memorization_status" AS ENUM('not_started', 'in_progress', 'memorized', 'consolidated');--> statement-breakpoint
CREATE TYPE "public"."feed_event_type" AS ENUM('surah_memorized', 'surah_validated', 'badge_earned', 'milestone_reached', 'streak_record', 'group_joined', 'announcement');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('revision_reminder', 'validation_done', 'badge_earned', 'group_announcement', 'new_member');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"avatar" text,
	"xp" text DEFAULT '0' NOT NULL,
	"current_streak" text DEFAULT '0' NOT NULL,
	"longest_streak" text DEFAULT '0' NOT NULL,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"user_id" text NOT NULL,
	"group_id" text NOT NULL,
	"role" "group_member_role" DEFAULT 'student' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "group_members_user_id_group_id_pk" PRIMARY KEY("user_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sheikh_id" text NOT NULL,
	"invite_code" text NOT NULL,
	"is_active" text DEFAULT 'true' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "surahs" (
	"id" integer PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"name_ar" text NOT NULL,
	"name_fr" text NOT NULL,
	"name_en" text NOT NULL,
	"name_translit" text NOT NULL,
	"verses_count" integer NOT NULL,
	"juz_number" integer NOT NULL,
	"hizb_number" integer NOT NULL,
	"revelation_type" "revelation_type" NOT NULL,
	"start_page" integer NOT NULL,
	"end_page" integer NOT NULL,
	CONSTRAINT "surahs_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "memorization_progress" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"surah_id" integer NOT NULL,
	"status" "memorization_status" DEFAULT 'not_started' NOT NULL,
	"verse_from" integer,
	"verse_to" integer,
	"last_revised_at" timestamp with time zone,
	"validated_by_sheikh_at" timestamp with time zone,
	"validated_by_sheikh_id" text,
	"sheikh_notes" text,
	"retention_score" real DEFAULT 2.5 NOT NULL,
	"repetition_count" integer DEFAULT 0 NOT NULL,
	"interval_days" integer DEFAULT 1 NOT NULL,
	"next_review_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memorization_progress_user_id_surah_id_unique" UNIQUE("user_id","surah_id")
);
--> statement-breakpoint
CREATE TABLE "revision_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"surah_id" integer NOT NULL,
	"duration" integer NOT NULL,
	"quality" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_ar" text NOT NULL,
	"description" text NOT NULL,
	"icon_url" text NOT NULL,
	"condition" text NOT NULL,
	"xp_reward" integer DEFAULT 100 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"badge_id" text NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_feed" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"user_id" text NOT NULL,
	"type" "feed_event_type" NOT NULL,
	"content" text NOT NULL,
	"reactions" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" "notification_type" NOT NULL,
	"payload" text DEFAULT '{}' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_sheikh_id_users_id_fk" FOREIGN KEY ("sheikh_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_progress" ADD CONSTRAINT "memorization_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_progress" ADD CONSTRAINT "memorization_progress_surah_id_surahs_id_fk" FOREIGN KEY ("surah_id") REFERENCES "public"."surahs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memorization_progress" ADD CONSTRAINT "memorization_progress_validated_by_sheikh_id_users_id_fk" FOREIGN KEY ("validated_by_sheikh_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_sessions" ADD CONSTRAINT "revision_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revision_sessions" ADD CONSTRAINT "revision_sessions_surah_id_surahs_id_fk" FOREIGN KEY ("surah_id") REFERENCES "public"."surahs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_feed" ADD CONSTRAINT "group_feed_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_feed" ADD CONSTRAINT "group_feed_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_members_group_idx" ON "group_members" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "progress_user_idx" ON "memorization_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "progress_surah_idx" ON "memorization_progress" USING btree ("surah_id");--> statement-breakpoint
CREATE INDEX "progress_next_review_idx" ON "memorization_progress" USING btree ("next_review_at");--> statement-breakpoint
CREATE INDEX "revision_user_idx" ON "revision_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "revision_date_idx" ON "revision_sessions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "user_badges_user_idx" ON "user_badges" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feed_group_idx" ON "group_feed" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "feed_date_idx" ON "group_feed" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("user_id","read_at");