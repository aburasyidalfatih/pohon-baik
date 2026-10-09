import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_moments_category" AS ENUM('bisa', 'kata', 'ibadah', 'lucu', 'syukur', 'catatan');
  CREATE TYPE "public"."enum_moments_source" AS ENUM('manual', 'milestone', 'majelis');
  CREATE TABLE "daily_logs" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"family_id" uuid NOT NULL,
  	"child_id" uuid,
  	"date" varchar NOT NULL,
  	"done" jsonb DEFAULT '[]'::jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "quran_entries" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"family_id" uuid NOT NULL,
  	"child_id" uuid NOT NULL,
  	"label" varchar NOT NULL,
  	"base" varchar NOT NULL,
  	"done" jsonb DEFAULT '[]'::jsonb NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "moments" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"family_id" uuid NOT NULL,
  	"child_id" uuid NOT NULL,
  	"date" varchar NOT NULL,
  	"category" "enum_moments_category" DEFAULT 'catatan' NOT NULL,
  	"text" varchar,
  	"source" "enum_moments_source" DEFAULT 'manual' NOT NULL,
  	"milestone_key" varchar,
  	"has_photo" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "milestones" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"family_id" uuid NOT NULL,
  	"child_id" uuid NOT NULL,
  	"key" varchar NOT NULL,
  	"seen_at" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "rapor_entries" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"family_id" uuid NOT NULL,
  	"child_id" uuid NOT NULL,
  	"semester" varchar NOT NULL,
  	"branch" varchar NOT NULL,
  	"level" numeric DEFAULT 0,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "daily_logs_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "quran_entries_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "moments_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "milestones_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "rapor_entries_id" uuid;
  ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quran_entries" ADD CONSTRAINT "quran_entries_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "quran_entries" ADD CONSTRAINT "quran_entries_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "moments" ADD CONSTRAINT "moments_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "moments" ADD CONSTRAINT "moments_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "milestones" ADD CONSTRAINT "milestones_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "milestones" ADD CONSTRAINT "milestones_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rapor_entries" ADD CONSTRAINT "rapor_entries_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "rapor_entries" ADD CONSTRAINT "rapor_entries_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "daily_logs_family_idx" ON "daily_logs" USING btree ("family_id");
  CREATE INDEX "daily_logs_child_idx" ON "daily_logs" USING btree ("child_id");
  CREATE INDEX "daily_logs_date_idx" ON "daily_logs" USING btree ("date");
  CREATE INDEX "daily_logs_updated_at_idx" ON "daily_logs" USING btree ("updated_at");
  CREATE INDEX "daily_logs_created_at_idx" ON "daily_logs" USING btree ("created_at");
  CREATE INDEX "quran_entries_family_idx" ON "quran_entries" USING btree ("family_id");
  CREATE INDEX "quran_entries_child_idx" ON "quran_entries" USING btree ("child_id");
  CREATE INDEX "quran_entries_base_idx" ON "quran_entries" USING btree ("base");
  CREATE INDEX "quran_entries_updated_at_idx" ON "quran_entries" USING btree ("updated_at");
  CREATE INDEX "quran_entries_created_at_idx" ON "quran_entries" USING btree ("created_at");
  CREATE INDEX "moments_family_idx" ON "moments" USING btree ("family_id");
  CREATE INDEX "moments_child_idx" ON "moments" USING btree ("child_id");
  CREATE INDEX "moments_date_idx" ON "moments" USING btree ("date");
  CREATE INDEX "moments_milestone_key_idx" ON "moments" USING btree ("milestone_key");
  CREATE INDEX "moments_updated_at_idx" ON "moments" USING btree ("updated_at");
  CREATE INDEX "moments_created_at_idx" ON "moments" USING btree ("created_at");
  CREATE INDEX "milestones_family_idx" ON "milestones" USING btree ("family_id");
  CREATE INDEX "milestones_child_idx" ON "milestones" USING btree ("child_id");
  CREATE INDEX "milestones_key_idx" ON "milestones" USING btree ("key");
  CREATE INDEX "milestones_seen_at_idx" ON "milestones" USING btree ("seen_at");
  CREATE INDEX "milestones_updated_at_idx" ON "milestones" USING btree ("updated_at");
  CREATE INDEX "milestones_created_at_idx" ON "milestones" USING btree ("created_at");
  CREATE INDEX "rapor_entries_family_idx" ON "rapor_entries" USING btree ("family_id");
  CREATE INDEX "rapor_entries_child_idx" ON "rapor_entries" USING btree ("child_id");
  CREATE INDEX "rapor_entries_semester_idx" ON "rapor_entries" USING btree ("semester");
  CREATE INDEX "rapor_entries_updated_at_idx" ON "rapor_entries" USING btree ("updated_at");
  CREATE INDEX "rapor_entries_created_at_idx" ON "rapor_entries" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_daily_logs_fk" FOREIGN KEY ("daily_logs_id") REFERENCES "public"."daily_logs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_quran_entries_fk" FOREIGN KEY ("quran_entries_id") REFERENCES "public"."quran_entries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_moments_fk" FOREIGN KEY ("moments_id") REFERENCES "public"."moments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_milestones_fk" FOREIGN KEY ("milestones_id") REFERENCES "public"."milestones"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_rapor_entries_fk" FOREIGN KEY ("rapor_entries_id") REFERENCES "public"."rapor_entries"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_daily_logs_id_idx" ON "payload_locked_documents_rels" USING btree ("daily_logs_id");
  CREATE INDEX "payload_locked_documents_rels_quran_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("quran_entries_id");
  CREATE INDEX "payload_locked_documents_rels_moments_id_idx" ON "payload_locked_documents_rels" USING btree ("moments_id");
  CREATE INDEX "payload_locked_documents_rels_milestones_id_idx" ON "payload_locked_documents_rels" USING btree ("milestones_id");
  CREATE INDEX "payload_locked_documents_rels_rapor_entries_id_idx" ON "payload_locked_documents_rels" USING btree ("rapor_entries_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "daily_logs" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "quran_entries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "moments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "milestones" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "rapor_entries" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "daily_logs" CASCADE;
  DROP TABLE "quran_entries" CASCADE;
  DROP TABLE "moments" CASCADE;
  DROP TABLE "milestones" CASCADE;
  DROP TABLE "rapor_entries" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_daily_logs_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_quran_entries_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_moments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_milestones_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_rapor_entries_fk";
  
  DROP INDEX "payload_locked_documents_rels_daily_logs_id_idx";
  DROP INDEX "payload_locked_documents_rels_quran_entries_id_idx";
  DROP INDEX "payload_locked_documents_rels_moments_id_idx";
  DROP INDEX "payload_locked_documents_rels_milestones_id_idx";
  DROP INDEX "payload_locked_documents_rels_rapor_entries_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "daily_logs_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "quran_entries_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "moments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "milestones_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "rapor_entries_id";
  DROP TYPE "public"."enum_moments_category";
  DROP TYPE "public"."enum_moments_source";`)
}
