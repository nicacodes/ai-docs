CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "document_embeddings" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"document_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"chunk_text" text NOT NULL,
	"model_id" text NOT NULL,
	"device" text NOT NULL,
	"pooling" text DEFAULT 'mean' NOT NULL,
	"normalize" integer DEFAULT 1 NOT NULL,
	"content_hash" text NOT NULL,
	"embedding" vector(1024) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"raw_markdown" text NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_embeddings_doc_chunk_model_device_unique" ON "document_embeddings" USING btree ("document_id","chunk_index","model_id","device");--> statement-breakpoint
CREATE INDEX "idx_document_embeddings_document_id" ON "document_embeddings" USING btree ("document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_slug_unique" ON "documents" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_documents_slug" ON "documents" USING btree ("slug");