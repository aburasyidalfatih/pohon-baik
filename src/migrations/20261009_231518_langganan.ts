import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_families_waiver_status" AS ENUM('none', 'requested', 'approved', 'rejected');
  CREATE TYPE "public"."enum_orders_status" AS ENUM('pending', 'paid', 'failed', 'expired', 'refunded');
  CREATE TYPE "public"."enum_orders_gateway" AS ENUM('midtrans', 'simulasi');
  CREATE TABLE "orders_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" uuid NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"child_id" uuid,
  	"child_name" varchar NOT NULL,
  	"price" numeric NOT NULL,
  	"paid_until" varchar
  );
  
  CREATE TABLE "orders" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"order_id" varchar NOT NULL,
  	"family_id" uuid NOT NULL,
  	"parent_id" uuid,
  	"amount" numeric NOT NULL,
  	"status" "enum_orders_status" DEFAULT 'pending' NOT NULL,
  	"gateway" "enum_orders_gateway" NOT NULL,
  	"payment_url" varchar,
  	"payment_type" varchar,
  	"paid_at" timestamp(3) with time zone,
  	"applied_at" timestamp(3) with time zone,
  	"last_notification" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "families" ADD COLUMN "trial_ends_at" varchar;
  ALTER TABLE "families" ADD COLUMN "waiver_status" "enum_families_waiver_status" DEFAULT 'none';
  ALTER TABLE "families" ADD COLUMN "waiver_reason" varchar;
  ALTER TABLE "families" ADD COLUMN "waiver_requested_at" timestamp(3) with time zone;
  ALTER TABLE "families" ADD COLUMN "waiver_until" varchar;
  ALTER TABLE "children" ADD COLUMN "paid_until" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "orders_id" uuid;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders_items" ADD CONSTRAINT "orders_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "orders" ADD CONSTRAINT "orders_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "orders_items_order_idx" ON "orders_items" USING btree ("_order");
  CREATE INDEX "orders_items_parent_id_idx" ON "orders_items" USING btree ("_parent_id");
  CREATE INDEX "orders_items_child_idx" ON "orders_items" USING btree ("child_id");
  CREATE UNIQUE INDEX "orders_order_id_idx" ON "orders" USING btree ("order_id");
  CREATE INDEX "orders_family_idx" ON "orders" USING btree ("family_id");
  CREATE INDEX "orders_parent_idx" ON "orders" USING btree ("parent_id");
  CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");
  CREATE INDEX "orders_updated_at_idx" ON "orders" USING btree ("updated_at");
  CREATE INDEX "orders_created_at_idx" ON "orders" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_orders_fk" FOREIGN KEY ("orders_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "children_paid_until_idx" ON "children" USING btree ("paid_until");
  CREATE INDEX "payload_locked_documents_rels_orders_id_idx" ON "payload_locked_documents_rels" USING btree ("orders_id");`)

  // Keluarga lama mendapat masa coba gratis 30 hari mulai hari aturan langganan berlaku (tanggal WIB).
  await db.execute(sql`
  UPDATE "families" SET "trial_ends_at" = to_char((now() AT TIME ZONE 'Asia/Jakarta')::date + 29, 'YYYY-MM-DD')
  WHERE "trial_ends_at" IS NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "orders_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "orders" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "orders_items" CASCADE;
  DROP TABLE "orders" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_orders_fk";
  
  DROP INDEX "children_paid_until_idx";
  DROP INDEX "payload_locked_documents_rels_orders_id_idx";
  ALTER TABLE "families" DROP COLUMN "trial_ends_at";
  ALTER TABLE "families" DROP COLUMN "waiver_status";
  ALTER TABLE "families" DROP COLUMN "waiver_reason";
  ALTER TABLE "families" DROP COLUMN "waiver_requested_at";
  ALTER TABLE "families" DROP COLUMN "waiver_until";
  ALTER TABLE "children" DROP COLUMN "paid_until";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "orders_id";
  DROP TYPE "public"."enum_families_waiver_status";
  DROP TYPE "public"."enum_orders_status";
  DROP TYPE "public"."enum_orders_gateway";`)
}
