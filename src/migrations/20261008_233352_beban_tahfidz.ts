import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_modules_tier" AS ENUM('inti', 'seimbang', 'penuh');
  CREATE TYPE "public"."enum_children_load" AS ENUM('inti', 'seimbang', 'penuh');
  CREATE TYPE "public"."enum_children_tahfidz_target" AS ENUM('kualitas', 'juz30', 'juz29-30', 'intensif');
  ALTER TABLE "modules" ADD COLUMN "tier" "enum_modules_tier" DEFAULT 'penuh';
  ALTER TABLE "children" ADD COLUMN "load" "enum_children_load" DEFAULT 'seimbang';
  ALTER TABLE "children" ADD COLUMN "tahfidz_target" "enum_children_tahfidz_target" DEFAULT 'juz30';
  ALTER TABLE "children" ADD COLUMN "skip_modules" jsonb DEFAULT '[]'::jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "modules" DROP COLUMN "tier";
  ALTER TABLE "children" DROP COLUMN "load";
  ALTER TABLE "children" DROP COLUMN "tahfidz_target";
  ALTER TABLE "children" DROP COLUMN "skip_modules";
  DROP TYPE "public"."enum_modules_tier";
  DROP TYPE "public"."enum_children_load";
  DROP TYPE "public"."enum_children_tahfidz_target";`)
}
