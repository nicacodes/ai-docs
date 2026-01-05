/**
 * Repositorio de Propuestas de Cambios
 *
 * Funciones de base de datos para gestionar propuestas.
 */

import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from './client';
import { changeProposals, type ProposalStatus } from './proposals-schema';
import { documents } from './schema';
import { user } from './auth-schema';

// ============================================================================
// Types
// ============================================================================

export interface ProposalRow {
  id: string;
  documentId: string;
  proposerId: string;
  proposedTitle: string;
  proposedMarkdown: string;
  message: string | null;
  status: ProposalStatus;
  reviewComment: string | null;
  createdAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
}

export interface ProposalWithDetails extends ProposalRow {
  // Datos del documento original
  originalTitle: string;
  originalMarkdown: string;
  documentSlug: string;
  // Datos del autor del documento
  authorId: string | null;
  authorName: string | null;
  authorEmail: string | null;
  // Datos del proponente
  proposerName: string | null;
  proposerEmail: string | null;
}

export interface CreateProposalInput {
  documentId: string;
  proposerId: string;
  proposedTitle: string;
  proposedMarkdown: string;
  message?: string;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Obtiene una propuesta por ID con todos los detalles
 */
export async function getProposalById(
  id: string,
): Promise<ProposalWithDetails | null> {
  const db = getDb();

  const rows = await db
    .select({
      // Propuesta
      id: changeProposals.id,
      documentId: changeProposals.documentId,
      proposerId: changeProposals.proposerId,
      proposedTitle: changeProposals.proposedTitle,
      proposedMarkdown: changeProposals.proposedMarkdown,
      message: changeProposals.message,
      status: changeProposals.status,
      reviewComment: changeProposals.reviewComment,
      createdAt: changeProposals.createdAt,
      updatedAt: changeProposals.updatedAt,
      reviewedAt: changeProposals.reviewedAt,
      // Documento original
      originalTitle: documents.title,
      originalMarkdown: documents.rawMarkdown,
      documentSlug: documents.slug,
      authorId: documents.authorId,
      // Autor del documento
      authorName: sql<string | null>`author.name`,
      authorEmail: sql<string | null>`author.email`,
      // Proponente
      proposerName: sql<string | null>`proposer.name`,
      proposerEmail: sql<string | null>`proposer.email`,
    })
    .from(changeProposals)
    .innerJoin(documents, eq(changeProposals.documentId, documents.id))
    .leftJoin(sql`${user} as author`, sql`${documents.authorId} = author.id`)
    .leftJoin(
      sql`${user} as proposer`,
      sql`${changeProposals.proposerId} = proposer.id`,
    )
    .where(eq(changeProposals.id, id))
    .limit(1);

  return (rows[0] as ProposalWithDetails | undefined) ?? null;
}

/**
 * Lista propuestas pendientes para un documento específico
 */
export async function listProposalsForDocument(
  documentId: string,
  status?: ProposalStatus,
): Promise<ProposalWithDetails[]> {
  const db = getDb();

  const conditions = [eq(changeProposals.documentId, documentId)];
  if (status) {
    conditions.push(eq(changeProposals.status, status));
  }

  const rows = await db
    .select({
      id: changeProposals.id,
      documentId: changeProposals.documentId,
      proposerId: changeProposals.proposerId,
      proposedTitle: changeProposals.proposedTitle,
      proposedMarkdown: changeProposals.proposedMarkdown,
      message: changeProposals.message,
      status: changeProposals.status,
      reviewComment: changeProposals.reviewComment,
      createdAt: changeProposals.createdAt,
      updatedAt: changeProposals.updatedAt,
      reviewedAt: changeProposals.reviewedAt,
      originalTitle: documents.title,
      originalMarkdown: documents.rawMarkdown,
      documentSlug: documents.slug,
      authorId: documents.authorId,
      authorName: sql<string | null>`author.name`,
      authorEmail: sql<string | null>`author.email`,
      proposerName: sql<string | null>`proposer.name`,
      proposerEmail: sql<string | null>`proposer.email`,
    })
    .from(changeProposals)
    .innerJoin(documents, eq(changeProposals.documentId, documents.id))
    .leftJoin(sql`${user} as author`, sql`${documents.authorId} = author.id`)
    .leftJoin(
      sql`${user} as proposer`,
      sql`${changeProposals.proposerId} = proposer.id`,
    )
    .where(and(...conditions))
    .orderBy(desc(changeProposals.createdAt));

  return rows as ProposalWithDetails[];
}

/**
 * Lista propuestas recibidas por un usuario (como autor de documentos)
 */
export async function listReceivedProposals(
  authorId: string,
  status?: ProposalStatus,
): Promise<ProposalWithDetails[]> {
  const db = getDb();

  const conditions = [eq(documents.authorId, authorId)];
  if (status) {
    conditions.push(eq(changeProposals.status, status));
  }

  const rows = await db
    .select({
      id: changeProposals.id,
      documentId: changeProposals.documentId,
      proposerId: changeProposals.proposerId,
      proposedTitle: changeProposals.proposedTitle,
      proposedMarkdown: changeProposals.proposedMarkdown,
      message: changeProposals.message,
      status: changeProposals.status,
      reviewComment: changeProposals.reviewComment,
      createdAt: changeProposals.createdAt,
      updatedAt: changeProposals.updatedAt,
      reviewedAt: changeProposals.reviewedAt,
      originalTitle: documents.title,
      originalMarkdown: documents.rawMarkdown,
      documentSlug: documents.slug,
      authorId: documents.authorId,
      authorName: sql<string | null>`author.name`,
      authorEmail: sql<string | null>`author.email`,
      proposerName: sql<string | null>`proposer.name`,
      proposerEmail: sql<string | null>`proposer.email`,
    })
    .from(changeProposals)
    .innerJoin(documents, eq(changeProposals.documentId, documents.id))
    .leftJoin(sql`${user} as author`, sql`${documents.authorId} = author.id`)
    .leftJoin(
      sql`${user} as proposer`,
      sql`${changeProposals.proposerId} = proposer.id`,
    )
    .where(and(...conditions))
    .orderBy(desc(changeProposals.createdAt));

  return rows as ProposalWithDetails[];
}

/**
 * Lista propuestas enviadas por un usuario
 */
export async function listSentProposals(
  proposerId: string,
  status?: ProposalStatus,
): Promise<ProposalWithDetails[]> {
  const db = getDb();

  const conditions = [eq(changeProposals.proposerId, proposerId)];
  if (status) {
    conditions.push(eq(changeProposals.status, status));
  }

  const rows = await db
    .select({
      id: changeProposals.id,
      documentId: changeProposals.documentId,
      proposerId: changeProposals.proposerId,
      proposedTitle: changeProposals.proposedTitle,
      proposedMarkdown: changeProposals.proposedMarkdown,
      message: changeProposals.message,
      status: changeProposals.status,
      reviewComment: changeProposals.reviewComment,
      createdAt: changeProposals.createdAt,
      updatedAt: changeProposals.updatedAt,
      reviewedAt: changeProposals.reviewedAt,
      originalTitle: documents.title,
      originalMarkdown: documents.rawMarkdown,
      documentSlug: documents.slug,
      authorId: documents.authorId,
      authorName: sql<string | null>`author.name`,
      authorEmail: sql<string | null>`author.email`,
      proposerName: sql<string | null>`proposer.name`,
      proposerEmail: sql<string | null>`proposer.email`,
    })
    .from(changeProposals)
    .innerJoin(documents, eq(changeProposals.documentId, documents.id))
    .leftJoin(sql`${user} as author`, sql`${documents.authorId} = author.id`)
    .leftJoin(
      sql`${user} as proposer`,
      sql`${changeProposals.proposerId} = proposer.id`,
    )
    .where(and(...conditions))
    .orderBy(desc(changeProposals.createdAt));

  return rows as ProposalWithDetails[];
}

/**
 * Cuenta propuestas pendientes para un usuario (autor)
 */
export async function countPendingProposals(authorId: string): Promise<number> {
  const db = getDb();

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(changeProposals)
    .innerJoin(documents, eq(changeProposals.documentId, documents.id))
    .where(
      and(
        eq(documents.authorId, authorId),
        eq(changeProposals.status, 'pending'),
      ),
    );

  return result[0]?.count ?? 0;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Crea una nueva propuesta de cambios
 */
export async function createProposal(
  input: CreateProposalInput,
): Promise<{ id: string }> {
  const db = getDb();

  const inserted = await db
    .insert(changeProposals)
    .values({
      documentId: input.documentId,
      proposerId: input.proposerId,
      proposedTitle: input.proposedTitle,
      proposedMarkdown: input.proposedMarkdown,
      message: input.message ?? null,
    })
    .returning({ id: changeProposals.id });

  return inserted[0]!;
}

/**
 * Aprueba una propuesta y actualiza el documento original
 */
export async function approveProposal(
  proposalId: string,
  reviewComment?: string,
): Promise<boolean> {
  const db = getDb();

  // Obtener la propuesta
  const proposal = await getProposalById(proposalId);
  if (!proposal || proposal.status !== 'pending') {
    return false;
  }

  // Transacción: actualizar documento + marcar propuesta como aprobada
  await db.transaction(async (tx) => {
    // Actualizar documento con los cambios propuestos
    await tx
      .update(documents)
      .set({
        title: proposal.proposedTitle,
        rawMarkdown: proposal.proposedMarkdown,
      })
      .where(eq(documents.id, proposal.documentId));

    // Marcar propuesta como aprobada
    await tx
      .update(changeProposals)
      .set({
        status: 'approved',
        reviewComment: reviewComment ?? null,
        reviewedAt: new Date(),
      })
      .where(eq(changeProposals.id, proposalId));
  });

  return true;
}

/**
 * Rechaza una propuesta
 */
export async function rejectProposal(
  proposalId: string,
  reviewComment?: string,
): Promise<boolean> {
  const db = getDb();

  const result = await db
    .update(changeProposals)
    .set({
      status: 'rejected',
      reviewComment: reviewComment ?? null,
      reviewedAt: new Date(),
    })
    .where(
      and(
        eq(changeProposals.id, proposalId),
        eq(changeProposals.status, 'pending'),
      ),
    )
    .returning({ id: changeProposals.id });

  return result.length > 0;
}

/**
 * Retira una propuesta (solo el proponente puede hacerlo)
 */
export async function withdrawProposal(
  proposalId: string,
  proposerId: string,
): Promise<boolean> {
  const db = getDb();

  const result = await db
    .update(changeProposals)
    .set({
      status: 'withdrawn',
      reviewedAt: new Date(),
    })
    .where(
      and(
        eq(changeProposals.id, proposalId),
        eq(changeProposals.proposerId, proposerId),
        eq(changeProposals.status, 'pending'),
      ),
    )
    .returning({ id: changeProposals.id });

  return result.length > 0;
}
