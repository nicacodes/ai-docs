CREATE TABLE "document_versions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"title" text NOT NULL,
	"raw_markdown" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" text,
	"change_message" text,
	"content_length" integer NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_document_versions_document_id" ON "document_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_document_versions_doc_version" ON "document_versions" USING btree ("document_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_document_versions_created_by" ON "document_versions" USING btree ("created_by");