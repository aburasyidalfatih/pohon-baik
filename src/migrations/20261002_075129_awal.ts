import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_branches_lapis" AS ENUM('Akar', 'Batang', 'Cabang', 'Buah');
  CREATE TYPE "public"."enum_modules_waktu" AS ENUM('subuh', 'pagi', 'dzuhur', 'ashar', 'maghrib', 'isya', 'hari');
  CREATE TYPE "public"."enum_modules_review_status" AS ENUM('review', 'approved', 'revise');
  CREATE TYPE "public"."enum_themes_review_status" AS ENUM('review', 'approved', 'revise');
  CREATE TYPE "public"."enum_theme_tasks_waktu" AS ENUM('subuh', 'pagi', 'dzuhur', 'ashar', 'maghrib', 'isya', 'hari');
  CREATE TYPE "public"."enum_theme_tasks_review_status" AS ENUM('review', 'approved', 'revise');
  CREATE TYPE "public"."enum_majelis_review_status" AS ENUM('review', 'approved', 'revise');
  CREATE TYPE "public"."enum_age_profiles_review_status" AS ENUM('review', 'approved', 'revise');
  CREATE TYPE "public"."enum_warnings_review_status" AS ENUM('review', 'approved', 'revise');
  CREATE TYPE "public"."enum_content_reviews_status" AS ENUM('approved', 'revise');
  CREATE TYPE "public"."enum_users_roles" AS ENUM('admin', 'konten', 'peninjau', 'dukungan');
  CREATE TYPE "public"."enum_families_members_role" AS ENUM('owner', 'parent', 'caregiver');
  CREATE TYPE "public"."enum_families_city" AS ENUM('jakarta', 'bekasi', 'bogor', 'depok', 'tangerang', 'bandung', 'semarang', 'yogyakarta', 'solo', 'surabaya', 'malang', 'bandaaceh', 'medan', 'padang', 'pekanbaru', 'palembang', 'lampung', 'pontianak', 'banjarmasin', 'balikpapan', 'samarinda', 'makassar', 'manado', 'denpasar', 'mataram', 'kupang', 'ambon', 'jayapura', 'custom');
  CREATE TYPE "public"."enum_families_tz" AS ENUM('7', '8', '9');
  CREATE TYPE "public"."enum_families_appearance" AS ENUM('auto', 'light', 'dark');
  CREATE TYPE "public"."enum_children_sex" AS ENUM('L', 'P');
  CREATE TABLE "bands_targets" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "bands" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"code" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"min_months" numeric NOT NULL,
  	"max_months" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "branches" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"code" varchar NOT NULL,
  	"name" varchar NOT NULL,
  	"lapis" "enum_branches_lapis" NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "modules" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"code" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar,
  	"branch_id" uuid NOT NULL,
  	"min_months" numeric NOT NULL,
  	"max_months" numeric NOT NULL,
  	"daily" boolean DEFAULT false,
  	"waktu" "enum_modules_waktu",
  	"review_status" "enum_modules_review_status" DEFAULT 'review' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "themes" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"order" numeric NOT NULL,
  	"title" varchar NOT NULL,
  	"surah" varchar NOT NULL,
  	"ayat" varchar,
  	"science" varchar,
  	"skill" varchar,
  	"review_status" "enum_themes_review_status" DEFAULT 'review' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "theme_tasks" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"theme_order" numeric,
  	"band_min" numeric,
  	"theme_id" uuid NOT NULL,
  	"band_id" uuid NOT NULL,
  	"week" numeric NOT NULL,
  	"order" numeric DEFAULT 0 NOT NULL,
  	"waktu" "enum_theme_tasks_waktu" DEFAULT 'pagi' NOT NULL,
  	"text" varchar NOT NULL,
  	"review_status" "enum_theme_tasks_review_status" DEFAULT 'review' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "majelis_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "majelis" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"theme_order" numeric,
  	"theme_id" uuid NOT NULL,
  	"day" numeric NOT NULL,
  	"story" varchar NOT NULL,
  	"review_status" "enum_majelis_review_status" DEFAULT 'review' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "age_profiles_feelings" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "age_profiles_normal" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"q" varchar NOT NULL,
  	"a" varchar NOT NULL
  );
  
  CREATE TABLE "age_profiles_milestones_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "age_profiles_milestones" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"age" varchar NOT NULL
  );
  
  CREATE TABLE "age_profiles_abilities_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "age_profiles_abilities" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"domain" varchar NOT NULL
  );
  
  CREATE TABLE "age_profiles_limits" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "age_profiles_stimulation" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "age_profiles_avoid" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "age_profiles_islam" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"source" varchar
  );
  
  CREATE TABLE "age_profiles_consult" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "age_profiles" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"year" numeric NOT NULL,
  	"label" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"summary" varchar NOT NULL,
  	"worship" varchar,
  	"review_status" "enum_age_profiles_review_status" DEFAULT 'review' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "warnings_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "warnings" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"label" varchar NOT NULL,
  	"min_months" numeric NOT NULL,
  	"max_months" numeric NOT NULL,
  	"review_status" "enum_warnings_review_status" DEFAULT 'review' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content_reviews" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"status" "enum_content_reviews_status" NOT NULL,
  	"notes" varchar,
  	"reviewer_id" uuid,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "content_reviews_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"modules_id" uuid,
  	"themes_id" uuid,
  	"theme_tasks_id" uuid,
  	"majelis_id" uuid,
  	"age_profiles_id" uuid,
  	"warnings_id" uuid
  );
  
  CREATE TABLE "media" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "users_roles" (
  	"order" integer NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"value" "enum_users_roles",
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL
  );
  
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "parents_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "parents" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"privacy_consent_at" timestamp(3) with time zone,
  	"privacy_version" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "families_members" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"role" "enum_families_members_role" DEFAULT 'parent' NOT NULL
  );
  
  CREATE TABLE "families" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar NOT NULL,
  	"city" "enum_families_city" DEFAULT 'jakarta' NOT NULL,
  	"lat" numeric,
  	"lon" numeric,
  	"tz" "enum_families_tz" DEFAULT '7',
  	"theme_start" varchar NOT NULL,
  	"theme_offset" numeric DEFAULT 0 NOT NULL,
  	"appearance" "enum_families_appearance" DEFAULT 'auto',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "children" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"family_id" uuid NOT NULL,
  	"name" varchar NOT NULL,
  	"dob" varchar NOT NULL,
  	"sex" "enum_children_sex",
  	"ability_overrides" jsonb DEFAULT '{}'::jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"bands_id" uuid,
  	"branches_id" uuid,
  	"modules_id" uuid,
  	"themes_id" uuid,
  	"theme_tasks_id" uuid,
  	"majelis_id" uuid,
  	"age_profiles_id" uuid,
  	"warnings_id" uuid,
  	"content_reviews_id" uuid,
  	"media_id" uuid,
  	"users_id" uuid,
  	"parents_id" uuid,
  	"families_id" uuid,
  	"children_id" uuid
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" uuid NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" uuid,
  	"parents_id" uuid
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "kurikulum_profile_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "kurikulum" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"warning_always" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "bands_targets" ADD CONSTRAINT "bands_targets_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."bands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "modules" ADD CONSTRAINT "modules_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "theme_tasks" ADD CONSTRAINT "theme_tasks_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "theme_tasks" ADD CONSTRAINT "theme_tasks_band_id_bands_id_fk" FOREIGN KEY ("band_id") REFERENCES "public"."bands"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "majelis_questions" ADD CONSTRAINT "majelis_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."majelis"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "majelis" ADD CONSTRAINT "majelis_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "age_profiles_feelings" ADD CONSTRAINT "age_profiles_feelings_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."age_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "age_profiles_normal" ADD CONSTRAINT "age_profiles_normal_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."age_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "age_profiles_milestones_items" ADD CONSTRAINT "age_profiles_milestones_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."age_profiles_milestones"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "age_profiles_milestones" ADD CONSTRAINT "age_profiles_milestones_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."age_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "age_profiles_abilities_items" ADD CONSTRAINT "age_profiles_abilities_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."age_profiles_abilities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "age_profiles_abilities" ADD CONSTRAINT "age_profiles_abilities_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."age_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "age_profiles_limits" ADD CONSTRAINT "age_profiles_limits_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."age_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "age_profiles_stimulation" ADD CONSTRAINT "age_profiles_stimulation_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."age_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "age_profiles_avoid" ADD CONSTRAINT "age_profiles_avoid_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."age_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "age_profiles_islam" ADD CONSTRAINT "age_profiles_islam_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."age_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "age_profiles_consult" ADD CONSTRAINT "age_profiles_consult_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."age_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "warnings_items" ADD CONSTRAINT "warnings_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."warnings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_reviewer_id_users_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "content_reviews_rels" ADD CONSTRAINT "content_reviews_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."content_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_reviews_rels" ADD CONSTRAINT "content_reviews_rels_modules_fk" FOREIGN KEY ("modules_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_reviews_rels" ADD CONSTRAINT "content_reviews_rels_themes_fk" FOREIGN KEY ("themes_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_reviews_rels" ADD CONSTRAINT "content_reviews_rels_theme_tasks_fk" FOREIGN KEY ("theme_tasks_id") REFERENCES "public"."theme_tasks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_reviews_rels" ADD CONSTRAINT "content_reviews_rels_majelis_fk" FOREIGN KEY ("majelis_id") REFERENCES "public"."majelis"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_reviews_rels" ADD CONSTRAINT "content_reviews_rels_age_profiles_fk" FOREIGN KEY ("age_profiles_id") REFERENCES "public"."age_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "content_reviews_rels" ADD CONSTRAINT "content_reviews_rels_warnings_fk" FOREIGN KEY ("warnings_id") REFERENCES "public"."warnings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_roles" ADD CONSTRAINT "users_roles_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "parents_sessions" ADD CONSTRAINT "parents_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "families_members" ADD CONSTRAINT "families_members_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "families_members" ADD CONSTRAINT "families_members_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "children" ADD CONSTRAINT "children_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_bands_fk" FOREIGN KEY ("bands_id") REFERENCES "public"."bands"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_branches_fk" FOREIGN KEY ("branches_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_modules_fk" FOREIGN KEY ("modules_id") REFERENCES "public"."modules"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_themes_fk" FOREIGN KEY ("themes_id") REFERENCES "public"."themes"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_theme_tasks_fk" FOREIGN KEY ("theme_tasks_id") REFERENCES "public"."theme_tasks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_majelis_fk" FOREIGN KEY ("majelis_id") REFERENCES "public"."majelis"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_age_profiles_fk" FOREIGN KEY ("age_profiles_id") REFERENCES "public"."age_profiles"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_warnings_fk" FOREIGN KEY ("warnings_id") REFERENCES "public"."warnings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_content_reviews_fk" FOREIGN KEY ("content_reviews_id") REFERENCES "public"."content_reviews"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parents_fk" FOREIGN KEY ("parents_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_families_fk" FOREIGN KEY ("families_id") REFERENCES "public"."families"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_children_fk" FOREIGN KEY ("children_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parents_fk" FOREIGN KEY ("parents_id") REFERENCES "public"."parents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "kurikulum_profile_sources" ADD CONSTRAINT "kurikulum_profile_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."kurikulum"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "bands_targets_order_idx" ON "bands_targets" USING btree ("_order");
  CREATE INDEX "bands_targets_parent_id_idx" ON "bands_targets" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "bands_code_idx" ON "bands" USING btree ("code");
  CREATE INDEX "bands_updated_at_idx" ON "bands" USING btree ("updated_at");
  CREATE INDEX "bands_created_at_idx" ON "bands" USING btree ("created_at");
  CREATE UNIQUE INDEX "branches_code_idx" ON "branches" USING btree ("code");
  CREATE INDEX "branches_updated_at_idx" ON "branches" USING btree ("updated_at");
  CREATE INDEX "branches_created_at_idx" ON "branches" USING btree ("created_at");
  CREATE UNIQUE INDEX "modules_code_idx" ON "modules" USING btree ("code");
  CREATE INDEX "modules_branch_idx" ON "modules" USING btree ("branch_id");
  CREATE INDEX "modules_min_months_idx" ON "modules" USING btree ("min_months");
  CREATE INDEX "modules_max_months_idx" ON "modules" USING btree ("max_months");
  CREATE INDEX "modules_review_status_idx" ON "modules" USING btree ("review_status");
  CREATE INDEX "modules_updated_at_idx" ON "modules" USING btree ("updated_at");
  CREATE INDEX "modules_created_at_idx" ON "modules" USING btree ("created_at");
  CREATE UNIQUE INDEX "themes_order_idx" ON "themes" USING btree ("order");
  CREATE INDEX "themes_review_status_idx" ON "themes" USING btree ("review_status");
  CREATE INDEX "themes_updated_at_idx" ON "themes" USING btree ("updated_at");
  CREATE INDEX "themes_created_at_idx" ON "themes" USING btree ("created_at");
  CREATE INDEX "theme_tasks_theme_order_idx" ON "theme_tasks" USING btree ("theme_order");
  CREATE INDEX "theme_tasks_band_min_idx" ON "theme_tasks" USING btree ("band_min");
  CREATE INDEX "theme_tasks_theme_idx" ON "theme_tasks" USING btree ("theme_id");
  CREATE INDEX "theme_tasks_band_idx" ON "theme_tasks" USING btree ("band_id");
  CREATE INDEX "theme_tasks_week_idx" ON "theme_tasks" USING btree ("week");
  CREATE INDEX "theme_tasks_review_status_idx" ON "theme_tasks" USING btree ("review_status");
  CREATE INDEX "theme_tasks_updated_at_idx" ON "theme_tasks" USING btree ("updated_at");
  CREATE INDEX "theme_tasks_created_at_idx" ON "theme_tasks" USING btree ("created_at");
  CREATE INDEX "majelis_questions_order_idx" ON "majelis_questions" USING btree ("_order");
  CREATE INDEX "majelis_questions_parent_id_idx" ON "majelis_questions" USING btree ("_parent_id");
  CREATE INDEX "majelis_theme_order_idx" ON "majelis" USING btree ("theme_order");
  CREATE INDEX "majelis_theme_idx" ON "majelis" USING btree ("theme_id");
  CREATE INDEX "majelis_day_idx" ON "majelis" USING btree ("day");
  CREATE INDEX "majelis_review_status_idx" ON "majelis" USING btree ("review_status");
  CREATE INDEX "majelis_updated_at_idx" ON "majelis" USING btree ("updated_at");
  CREATE INDEX "majelis_created_at_idx" ON "majelis" USING btree ("created_at");
  CREATE INDEX "age_profiles_feelings_order_idx" ON "age_profiles_feelings" USING btree ("_order");
  CREATE INDEX "age_profiles_feelings_parent_id_idx" ON "age_profiles_feelings" USING btree ("_parent_id");
  CREATE INDEX "age_profiles_normal_order_idx" ON "age_profiles_normal" USING btree ("_order");
  CREATE INDEX "age_profiles_normal_parent_id_idx" ON "age_profiles_normal" USING btree ("_parent_id");
  CREATE INDEX "age_profiles_milestones_items_order_idx" ON "age_profiles_milestones_items" USING btree ("_order");
  CREATE INDEX "age_profiles_milestones_items_parent_id_idx" ON "age_profiles_milestones_items" USING btree ("_parent_id");
  CREATE INDEX "age_profiles_milestones_order_idx" ON "age_profiles_milestones" USING btree ("_order");
  CREATE INDEX "age_profiles_milestones_parent_id_idx" ON "age_profiles_milestones" USING btree ("_parent_id");
  CREATE INDEX "age_profiles_abilities_items_order_idx" ON "age_profiles_abilities_items" USING btree ("_order");
  CREATE INDEX "age_profiles_abilities_items_parent_id_idx" ON "age_profiles_abilities_items" USING btree ("_parent_id");
  CREATE INDEX "age_profiles_abilities_order_idx" ON "age_profiles_abilities" USING btree ("_order");
  CREATE INDEX "age_profiles_abilities_parent_id_idx" ON "age_profiles_abilities" USING btree ("_parent_id");
  CREATE INDEX "age_profiles_limits_order_idx" ON "age_profiles_limits" USING btree ("_order");
  CREATE INDEX "age_profiles_limits_parent_id_idx" ON "age_profiles_limits" USING btree ("_parent_id");
  CREATE INDEX "age_profiles_stimulation_order_idx" ON "age_profiles_stimulation" USING btree ("_order");
  CREATE INDEX "age_profiles_stimulation_parent_id_idx" ON "age_profiles_stimulation" USING btree ("_parent_id");
  CREATE INDEX "age_profiles_avoid_order_idx" ON "age_profiles_avoid" USING btree ("_order");
  CREATE INDEX "age_profiles_avoid_parent_id_idx" ON "age_profiles_avoid" USING btree ("_parent_id");
  CREATE INDEX "age_profiles_islam_order_idx" ON "age_profiles_islam" USING btree ("_order");
  CREATE INDEX "age_profiles_islam_parent_id_idx" ON "age_profiles_islam" USING btree ("_parent_id");
  CREATE INDEX "age_profiles_consult_order_idx" ON "age_profiles_consult" USING btree ("_order");
  CREATE INDEX "age_profiles_consult_parent_id_idx" ON "age_profiles_consult" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "age_profiles_year_idx" ON "age_profiles" USING btree ("year");
  CREATE INDEX "age_profiles_review_status_idx" ON "age_profiles" USING btree ("review_status");
  CREATE INDEX "age_profiles_updated_at_idx" ON "age_profiles" USING btree ("updated_at");
  CREATE INDEX "age_profiles_created_at_idx" ON "age_profiles" USING btree ("created_at");
  CREATE INDEX "warnings_items_order_idx" ON "warnings_items" USING btree ("_order");
  CREATE INDEX "warnings_items_parent_id_idx" ON "warnings_items" USING btree ("_parent_id");
  CREATE INDEX "warnings_review_status_idx" ON "warnings" USING btree ("review_status");
  CREATE INDEX "warnings_updated_at_idx" ON "warnings" USING btree ("updated_at");
  CREATE INDEX "warnings_created_at_idx" ON "warnings" USING btree ("created_at");
  CREATE INDEX "content_reviews_reviewer_idx" ON "content_reviews" USING btree ("reviewer_id");
  CREATE INDEX "content_reviews_updated_at_idx" ON "content_reviews" USING btree ("updated_at");
  CREATE INDEX "content_reviews_created_at_idx" ON "content_reviews" USING btree ("created_at");
  CREATE INDEX "content_reviews_rels_order_idx" ON "content_reviews_rels" USING btree ("order");
  CREATE INDEX "content_reviews_rels_parent_idx" ON "content_reviews_rels" USING btree ("parent_id");
  CREATE INDEX "content_reviews_rels_path_idx" ON "content_reviews_rels" USING btree ("path");
  CREATE INDEX "content_reviews_rels_modules_id_idx" ON "content_reviews_rels" USING btree ("modules_id");
  CREATE INDEX "content_reviews_rels_themes_id_idx" ON "content_reviews_rels" USING btree ("themes_id");
  CREATE INDEX "content_reviews_rels_theme_tasks_id_idx" ON "content_reviews_rels" USING btree ("theme_tasks_id");
  CREATE INDEX "content_reviews_rels_majelis_id_idx" ON "content_reviews_rels" USING btree ("majelis_id");
  CREATE INDEX "content_reviews_rels_age_profiles_id_idx" ON "content_reviews_rels" USING btree ("age_profiles_id");
  CREATE INDEX "content_reviews_rels_warnings_id_idx" ON "content_reviews_rels" USING btree ("warnings_id");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "users_roles_order_idx" ON "users_roles" USING btree ("order");
  CREATE INDEX "users_roles_parent_idx" ON "users_roles" USING btree ("parent_id");
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "parents_sessions_order_idx" ON "parents_sessions" USING btree ("_order");
  CREATE INDEX "parents_sessions_parent_id_idx" ON "parents_sessions" USING btree ("_parent_id");
  CREATE INDEX "parents_updated_at_idx" ON "parents" USING btree ("updated_at");
  CREATE INDEX "parents_created_at_idx" ON "parents" USING btree ("created_at");
  CREATE UNIQUE INDEX "parents_email_idx" ON "parents" USING btree ("email");
  CREATE INDEX "families_members_order_idx" ON "families_members" USING btree ("_order");
  CREATE INDEX "families_members_parent_id_idx" ON "families_members" USING btree ("_parent_id");
  CREATE INDEX "families_members_parent_idx" ON "families_members" USING btree ("parent_id");
  CREATE INDEX "families_updated_at_idx" ON "families" USING btree ("updated_at");
  CREATE INDEX "families_created_at_idx" ON "families" USING btree ("created_at");
  CREATE INDEX "children_family_idx" ON "children" USING btree ("family_id");
  CREATE INDEX "children_updated_at_idx" ON "children" USING btree ("updated_at");
  CREATE INDEX "children_created_at_idx" ON "children" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_bands_id_idx" ON "payload_locked_documents_rels" USING btree ("bands_id");
  CREATE INDEX "payload_locked_documents_rels_branches_id_idx" ON "payload_locked_documents_rels" USING btree ("branches_id");
  CREATE INDEX "payload_locked_documents_rels_modules_id_idx" ON "payload_locked_documents_rels" USING btree ("modules_id");
  CREATE INDEX "payload_locked_documents_rels_themes_id_idx" ON "payload_locked_documents_rels" USING btree ("themes_id");
  CREATE INDEX "payload_locked_documents_rels_theme_tasks_id_idx" ON "payload_locked_documents_rels" USING btree ("theme_tasks_id");
  CREATE INDEX "payload_locked_documents_rels_majelis_id_idx" ON "payload_locked_documents_rels" USING btree ("majelis_id");
  CREATE INDEX "payload_locked_documents_rels_age_profiles_id_idx" ON "payload_locked_documents_rels" USING btree ("age_profiles_id");
  CREATE INDEX "payload_locked_documents_rels_warnings_id_idx" ON "payload_locked_documents_rels" USING btree ("warnings_id");
  CREATE INDEX "payload_locked_documents_rels_content_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("content_reviews_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_parents_id_idx" ON "payload_locked_documents_rels" USING btree ("parents_id");
  CREATE INDEX "payload_locked_documents_rels_families_id_idx" ON "payload_locked_documents_rels" USING btree ("families_id");
  CREATE INDEX "payload_locked_documents_rels_children_id_idx" ON "payload_locked_documents_rels" USING btree ("children_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_preferences_rels_parents_id_idx" ON "payload_preferences_rels" USING btree ("parents_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "kurikulum_profile_sources_order_idx" ON "kurikulum_profile_sources" USING btree ("_order");
  CREATE INDEX "kurikulum_profile_sources_parent_id_idx" ON "kurikulum_profile_sources" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "bands_targets" CASCADE;
  DROP TABLE "bands" CASCADE;
  DROP TABLE "branches" CASCADE;
  DROP TABLE "modules" CASCADE;
  DROP TABLE "themes" CASCADE;
  DROP TABLE "theme_tasks" CASCADE;
  DROP TABLE "majelis_questions" CASCADE;
  DROP TABLE "majelis" CASCADE;
  DROP TABLE "age_profiles_feelings" CASCADE;
  DROP TABLE "age_profiles_normal" CASCADE;
  DROP TABLE "age_profiles_milestones_items" CASCADE;
  DROP TABLE "age_profiles_milestones" CASCADE;
  DROP TABLE "age_profiles_abilities_items" CASCADE;
  DROP TABLE "age_profiles_abilities" CASCADE;
  DROP TABLE "age_profiles_limits" CASCADE;
  DROP TABLE "age_profiles_stimulation" CASCADE;
  DROP TABLE "age_profiles_avoid" CASCADE;
  DROP TABLE "age_profiles_islam" CASCADE;
  DROP TABLE "age_profiles_consult" CASCADE;
  DROP TABLE "age_profiles" CASCADE;
  DROP TABLE "warnings_items" CASCADE;
  DROP TABLE "warnings" CASCADE;
  DROP TABLE "content_reviews" CASCADE;
  DROP TABLE "content_reviews_rels" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "users_roles" CASCADE;
  DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "parents_sessions" CASCADE;
  DROP TABLE "parents" CASCADE;
  DROP TABLE "families_members" CASCADE;
  DROP TABLE "families" CASCADE;
  DROP TABLE "children" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "kurikulum_profile_sources" CASCADE;
  DROP TABLE "kurikulum" CASCADE;
  DROP TYPE "public"."enum_branches_lapis";
  DROP TYPE "public"."enum_modules_waktu";
  DROP TYPE "public"."enum_modules_review_status";
  DROP TYPE "public"."enum_themes_review_status";
  DROP TYPE "public"."enum_theme_tasks_waktu";
  DROP TYPE "public"."enum_theme_tasks_review_status";
  DROP TYPE "public"."enum_majelis_review_status";
  DROP TYPE "public"."enum_age_profiles_review_status";
  DROP TYPE "public"."enum_warnings_review_status";
  DROP TYPE "public"."enum_content_reviews_status";
  DROP TYPE "public"."enum_users_roles";
  DROP TYPE "public"."enum_families_members_role";
  DROP TYPE "public"."enum_families_city";
  DROP TYPE "public"."enum_families_tz";
  DROP TYPE "public"."enum_families_appearance";
  DROP TYPE "public"."enum_children_sex";`)
}
