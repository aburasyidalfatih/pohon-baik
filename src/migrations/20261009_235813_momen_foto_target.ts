import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_moments_source" ADD VALUE 'target' BEFORE 'majelis';
  CREATE TABLE "moment_photos" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"family_id" uuid NOT NULL,
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
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar
  );
  
  ALTER TABLE "moments" ADD COLUMN "effort" varchar;
  ALTER TABLE "moments" ADD COLUMN "photo_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "moment_photos_id" uuid;
  ALTER TABLE "moment_photos" ADD CONSTRAINT "moment_photos_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "moment_photos_family_idx" ON "moment_photos" USING btree ("family_id");
  CREATE INDEX "moment_photos_updated_at_idx" ON "moment_photos" USING btree ("updated_at");
  CREATE INDEX "moment_photos_created_at_idx" ON "moment_photos" USING btree ("created_at");
  CREATE UNIQUE INDEX "moment_photos_filename_idx" ON "moment_photos" USING btree ("filename");
  CREATE INDEX "moment_photos_sizes_thumb_sizes_thumb_filename_idx" ON "moment_photos" USING btree ("sizes_thumb_filename");
  ALTER TABLE "moments" ADD CONSTRAINT "moments_photo_id_moment_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."moment_photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_moment_photos_fk" FOREIGN KEY ("moment_photos_id") REFERENCES "public"."moment_photos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "moments_photo_idx" ON "moments" USING btree ("photo_id");
  CREATE INDEX "payload_locked_documents_rels_moment_photos_id_idx" ON "payload_locked_documents_rels" USING btree ("moment_photos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "moment_photos" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "moment_photos" CASCADE;
  ALTER TABLE "moments" DROP CONSTRAINT "moments_photo_id_moment_photos_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_moment_photos_fk";
  
  ALTER TABLE "moments" ALTER COLUMN "source" SET DATA TYPE text;
  ALTER TABLE "moments" ALTER COLUMN "source" SET DEFAULT 'manual'::text;
  DROP TYPE "public"."enum_moments_source";
  CREATE TYPE "public"."enum_moments_source" AS ENUM('manual', 'milestone', 'majelis');
  ALTER TABLE "moments" ALTER COLUMN "source" SET DEFAULT 'manual'::"public"."enum_moments_source";
  ALTER TABLE "moments" ALTER COLUMN "source" SET DATA TYPE "public"."enum_moments_source" USING "source"::"public"."enum_moments_source";
  DROP INDEX "moments_photo_idx";
  DROP INDEX "payload_locked_documents_rels_moment_photos_id_idx";
  ALTER TABLE "moments" DROP COLUMN "effort";
  ALTER TABLE "moments" DROP COLUMN "photo_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "moment_photos_id";`)
}
