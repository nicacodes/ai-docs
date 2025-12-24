CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint

-- Asegura que el default exista incluso si la tabla se creó antes de habilitar pgcrypto.
ALTER TABLE "documents" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
