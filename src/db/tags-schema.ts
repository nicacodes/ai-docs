/**
 * Schema de Tags/Categorías
 *
 * Sistema de etiquetas para clasificar documentos.
 * Relación many-to-many entre documents y tags.
 */

import {
  pgTable,
  text,
  uuid,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { documents } from './schema';

// ============================================================================
// Tags Table
// ============================================================================

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull().unique(),
    slug: text('slug').notNull().unique(),
    description: text('description'),
    color: text('color').default('#6366f1'), // Color para UI (default: indigo)
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_tags_slug').on(table.slug),
    index('idx_tags_name').on(table.name),
  ],
);

// ============================================================================
// Document-Tags Junction Table (many-to-many)
// ============================================================================

export const documentTags = pgTable(
  'document_tags',
  {
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.documentId, table.tagId] }),
    index('idx_document_tags_document').on(table.documentId),
    index('idx_document_tags_tag').on(table.tagId),
  ],
);

// ============================================================================
// Types
// ============================================================================

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;
export type DocumentTag = typeof documentTags.$inferSelect;
