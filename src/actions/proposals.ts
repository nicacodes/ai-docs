/**
 * Proposals Actions - Astro Server Actions para propuestas de cambios
 */

import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';
import { auth } from '../lib/auth';
import {
  createProposal,
  getProposalById,
  listReceivedProposals,
  listSentProposals,
  approveProposal,
  rejectProposal,
  withdrawProposal,
  countPendingProposals,
} from '../db/proposals';
import { getDocumentById } from '../db/documents';
import {
  notifyProposalReceived,
  notifyProposalApproved,
  notifyProposalRejected,
} from '../db/notifications';

// ============================================================================
// Schemas
// ============================================================================

const createProposalSchema = z.object({
  documentId: z.string().uuid(),
  proposedTitle: z.string().min(1),
  proposedMarkdown: z.string().min(1),
  message: z.string().optional(),
});

const reviewProposalSchema = z.object({
  proposalId: z.string().uuid(),
  comment: z.string().optional(),
});

const listProposalsSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'withdrawn']).optional(),
});

const getProposalSchema = z.object({
  id: z.string().uuid(),
});

// ============================================================================
// Actions
// ============================================================================

export const proposalsActions = {
  /**
   * Crea una nueva propuesta de cambios
   */
  create: defineAction({
    input: createProposalSchema,
    handler: async (
      { documentId, proposedTitle, proposedMarkdown, message },
      context,
    ) => {
      // Verificar autenticación
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });

      if (!session?.user) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Debes iniciar sesión para proponer cambios.',
        });
      }

      // Verificar que el documento existe
      const document = await getDocumentById(documentId);
      if (!document) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'Documento no encontrado.',
        });
      }

      // Verificar que no es el autor (no puede proponer cambios a su propio doc)
      if (document.authorId === session.user.id) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message:
            'No puedes proponer cambios a tu propio documento. Edítalo directamente.',
        });
      }

      // Crear la propuesta
      const proposal = await createProposal({
        documentId,
        proposerId: session.user.id,
        proposedTitle,
        proposedMarkdown,
        message,
      });

      // Notificar al autor del documento
      if (document.authorId) {
        await notifyProposalReceived(
          document.authorId,
          session.user.name || session.user.email,
          document.title,
          proposal.id,
        );
      }

      return { id: proposal.id };
    },
  }),

  /**
   * Obtiene una propuesta por ID
   */
  getById: defineAction({
    input: getProposalSchema,
    handler: async ({ id }, context) => {
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });

      const proposal = await getProposalById(id);

      if (!proposal) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'Propuesta no encontrada.',
        });
      }

      // Verificar permisos: autor del documento o proponente
      const isAuthor = session?.user?.id === proposal.authorId;
      const isProposer = session?.user?.id === proposal.proposerId;

      if (!isAuthor && !isProposer) {
        throw new ActionError({
          code: 'FORBIDDEN',
          message: 'No tienes permiso para ver esta propuesta.',
        });
      }

      return proposal;
    },
  }),

  /**
   * Lista propuestas recibidas (como autor de documentos)
   */
  listReceived: defineAction({
    input: listProposalsSchema,
    handler: async ({ status }, context) => {
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });

      if (!session?.user) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Debes iniciar sesión.',
        });
      }

      return listReceivedProposals(session.user.id, status);
    },
  }),

  /**
   * Lista propuestas enviadas por el usuario
   */
  listSent: defineAction({
    input: listProposalsSchema,
    handler: async ({ status }, context) => {
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });

      if (!session?.user) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Debes iniciar sesión.',
        });
      }

      return listSentProposals(session.user.id, status);
    },
  }),

  /**
   * Cuenta propuestas pendientes para el usuario
   */
  countPending: defineAction({
    input: z.object({}),
    handler: async (_, context) => {
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });

      if (!session?.user) {
        return { count: 0 };
      }

      const count = await countPendingProposals(session.user.id);
      return { count };
    },
  }),

  /**
   * Aprueba una propuesta (solo el autor del documento)
   */
  approve: defineAction({
    input: reviewProposalSchema,
    handler: async ({ proposalId, comment }, context) => {
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });

      if (!session?.user) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Debes iniciar sesión.',
        });
      }

      // Verificar que es el autor del documento
      const proposal = await getProposalById(proposalId);
      if (!proposal) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'Propuesta no encontrada.',
        });
      }

      if (proposal.authorId !== session.user.id) {
        throw new ActionError({
          code: 'FORBIDDEN',
          message: 'Solo el autor del documento puede aprobar propuestas.',
        });
      }

      const success = await approveProposal(proposalId, comment);
      if (!success) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'No se pudo aprobar la propuesta.',
        });
      }

      // Notificar al proponente
      await notifyProposalApproved(
        proposal.proposerId,
        proposal.originalTitle,
        proposal.documentSlug,
        proposalId,
      );

      return { success: true };
    },
  }),

  /**
   * Rechaza una propuesta (solo el autor del documento)
   */
  reject: defineAction({
    input: reviewProposalSchema,
    handler: async ({ proposalId, comment }, context) => {
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });

      if (!session?.user) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Debes iniciar sesión.',
        });
      }

      // Verificar que es el autor del documento
      const proposal = await getProposalById(proposalId);
      if (!proposal) {
        throw new ActionError({
          code: 'NOT_FOUND',
          message: 'Propuesta no encontrada.',
        });
      }

      if (proposal.authorId !== session.user.id) {
        throw new ActionError({
          code: 'FORBIDDEN',
          message: 'Solo el autor del documento puede rechazar propuestas.',
        });
      }

      const success = await rejectProposal(proposalId, comment);
      if (!success) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'No se pudo rechazar la propuesta.',
        });
      }

      // Notificar al proponente
      await notifyProposalRejected(
        proposal.proposerId,
        proposal.originalTitle,
        proposalId,
        comment,
      );

      return { success: true };
    },
  }),

  /**
   * Retira una propuesta (solo el proponente)
   */
  withdraw: defineAction({
    input: getProposalSchema,
    handler: async ({ id }, context) => {
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });

      if (!session?.user) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Debes iniciar sesión.',
        });
      }

      const success = await withdrawProposal(id, session.user.id);
      if (!success) {
        throw new ActionError({
          code: 'BAD_REQUEST',
          message: 'No se pudo retirar la propuesta.',
        });
      }

      return { success: true };
    },
  }),
};
