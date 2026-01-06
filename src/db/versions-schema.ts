/**
 * Schema: Document Versions
 *
 * Historial de versiones de documentos, similar a git history.
 * Cada vez que se guarda un documento, se crea una nueva versión.
 */

import {
  bigserial,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { documents } from './schema';
import { user } from './auth-schema';

/**
 * Tabla de versiones de documentos.
 * Guarda snapshots del contenido en cada guardado.
 */
export const documentVersions = pgTable(
  'document_versions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),

    /** Documento al que pertenece esta versión */
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),

    /** Número de versión (autoincremental por documento) */
    versionNumber: integer('version_number').notNull(),

    /** Título en esta versión */
    title: text('title').notNull(),

    /** Contenido markdown en esta versión */
    rawMarkdown: text('raw_markdown').notNull(),

    /** Metadata adicional en esta versión */
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),

    /** Usuario que creó esta versión (puede ser diferente al autor original) */
    createdBy: text('created_by').references(() => user.id, {
      onDelete: 'set null',
    }),

    /** Mensaje opcional describiendo los cambios (como un commit message) */
    changeMessage: text('change_message'),

    /** Tamaño en caracteres del contenido (útil para estadísticas) */
    contentLength: integer('content_length').notNull(),

    /** Hash del contenido para detectar cambios reales */
    contentHash: text('content_hash').notNull(),

    /** Timestamp de creación */
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Índice para buscar versiones de un documento ordenadas
    index('idx_document_versions_document_id').on(table.documentId),
    // Índice compuesto para obtener versión específica
    index('idx_document_versions_doc_version').on(
      table.documentId,
      table.versionNumber,
    ),
    // Índice para buscar por usuario
    index('idx_document_versions_created_by').on(table.createdBy),
  ],
);

// ============================================================================
// Types
// ============================================================================

export type DocumentVersion = typeof documentVersions.$inferSelect;
export type NewDocumentVersion = typeof documentVersions.$inferInsert;

/** Versión con información del usuario que la creó */
export interface DocumentVersionWithUser extends DocumentVersion {
  createdByName: string | null;
  createdByEmail: string | null;
}

/** Resumen de versión para listados (sin contenido completo) */
export interface DocumentVersionSummary {
  id: number;
  versionNumber: number;
  title: string;
  changeMessage: string | null;
  contentLength: number;
  createdBy: string | null;
  createdByName: string | null;
  createdAt: Date;
}
