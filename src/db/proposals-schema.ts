/**
 * Schema para Propuestas de Cambios (Change Proposals)
 *
 * Sistema similar a Pull Requests donde usuarios pueden proponer
 * cambios a documentos de otros usuarios.
 */

import { sql } from 'drizzle-orm';
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { documents } from './schema';
import { user } from './auth-schema';

// Estados posibles de una propuesta
export const proposalStatusEnum = pgEnum('proposal_status', [
  'pending', // Esperando revisión del autor
  'approved', // Aprobada y fusionada
  'rejected', // Rechazada por el autor
  'withdrawn', // Retirada por el proponente
]);

/**
 * Tabla de propuestas de cambios
 * Almacena los cambios propuestos a un documento
 */
export const changeProposals = pgTable(
  'change_proposals',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Documento al que se proponen cambios
    documentId: uuid('document_id')
      .notNull()
      .references(() => documents.id, { onDelete: 'cascade' }),

    // Usuario que propone los cambios
    proposerId: text('proposer_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Contenido propuesto
    proposedTitle: text('proposed_title').notNull(),
    proposedMarkdown: text('proposed_markdown').notNull(),

    // Mensaje/descripción de la propuesta
    message: text('message'),

    // Estado de la propuesta
    status: proposalStatusEnum('status').notNull().default('pending'),

    // Feedback del autor (al aprobar/rechazar)
    reviewComment: text('review_comment'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    index('idx_proposals_document_id').on(table.documentId),
    index('idx_proposals_proposer_id').on(table.proposerId),
    index('idx_proposals_status').on(table.status),
    index('idx_proposals_created_at').on(table.createdAt),
  ],
);

// Tipos exportados
export type ChangeProposal = typeof changeProposals.$inferSelect;
export type NewChangeProposal = typeof changeProposals.$inferInsert;
export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';
