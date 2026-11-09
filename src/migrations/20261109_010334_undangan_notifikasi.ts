import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_family_invites_role" AS ENUM('parent', 'caregiver');
  CREATE TABLE "push_subscriptions" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"parent_id" uuid NOT NULL,
  	"family_id" uuid NOT NULL,
  	"endpoint" varchar NOT NULL,
  	"keys" jsonb NOT NULL,
  	"device" varchar,
  	"last_sent" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "family_invites" (
  	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  	"family_id" uuid NOT NULL,
  	"token" varchar NOT NULL,
  	"role" "enum_family_invites_role" DEFAULT 'parent' NOT NULL,
  	"email" varchar,
  	"created_by_id" uuid,
  	"expires_at" timestamp(3) with time zone NOT NULL,
  	"used_by_id" uuid,
  	"used_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "push_subscriptions_id" uuid;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "family_invites_id" uuid;
  ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_parent_id_parents_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_created_by_id_parents_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."parents"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "family_invites" ADD CONSTRAINT "family_invites_used_by_id_parents_id_fk" FOREIGN KEY ("used_by_id") REFERENCES "public"."parents"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "push_subscriptions_parent_idx" ON "push_subscriptions" USING btree ("parent_id");
  CREATE INDEX "push_subscriptions_family_idx" ON "push_subscriptions" USING btree ("family_id");
  CREATE UNIQUE INDEX "push_subscriptions_endpoint_idx" ON "push_subscriptions" USING btree ("endpoint");
  CREATE INDEX "push_subscriptions_updated_at_idx" ON "push_subscriptions" USING btree ("updated_at");
  CREATE INDEX "push_subscriptions_created_at_idx" ON "push_subscriptions" USING btree ("created_at");
  CREATE INDEX "family_invites_family_idx" ON "family_invites" USING btree ("family_id");
  CREATE UNIQUE INDEX "family_invites_token_idx" ON "family_invites" USING btree ("token");
  CREATE INDEX "family_invites_created_by_idx" ON "family_invites" USING btree ("created_by_id");
  CREATE INDEX "family_invites_used_by_idx" ON "family_invites" USING btree ("used_by_id");
  CREATE INDEX "family_invites_updated_at_idx" ON "family_invites" USING btree ("updated_at");
  CREATE INDEX "family_invites_created_at_idx" ON "family_invites" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_push_subscriptions_fk" FOREIGN KEY ("push_subscriptions_id") REFERENCES "public"."push_subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_family_invites_fk" FOREIGN KEY ("family_invites_id") REFERENCES "public"."family_invites"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_push_subscriptions_id_idx" ON "payload_locked_documents_rels" USING btree ("push_subscriptions_id");
  CREATE INDEX "payload_locked_documents_rels_family_invites_id_idx" ON "payload_locked_documents_rels" USING btree ("family_invites_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "push_subscriptions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "family_invites" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "push_subscriptions" CASCADE;
  DROP TABLE "family_invites" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_push_subscriptions_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_family_invites_fk";
  
  DROP INDEX "payload_locked_documents_rels_push_subscriptions_id_idx";
  DROP INDEX "payload_locked_documents_rels_family_invites_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "push_subscriptions_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "family_invites_id";
  DROP TYPE "public"."enum_family_invites_role";`)
}
