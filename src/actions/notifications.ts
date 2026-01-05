/**
 * Notifications Actions - Astro Server Actions para notificaciones
 */

import { defineAction, ActionError } from 'astro:actions';
import { z } from 'astro/zod';
import { auth } from '../lib/auth';
import {
  listNotifications,
  countUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../db/notifications';

// ============================================================================
// Schemas
// ============================================================================

const listNotificationsSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  unreadOnly: z.boolean().default(false),
});

const markReadSchema = z.object({
  id: z.string().uuid(),
});

// ============================================================================
// Actions
// ============================================================================

export const notificationsActions = {
  /**
   * Lista notificaciones del usuario actual
   */
  list: defineAction({
    input: listNotificationsSchema,
    handler: async ({ limit, unreadOnly }, context) => {
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });

      if (!session?.user) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Debes iniciar sesión.',
        });
      }

      return listNotifications(session.user.id, { limit, unreadOnly });
    },
  }),

  /**
   * Cuenta notificaciones no leídas
   */
  countUnread: defineAction({
    input: z.object({}),
    handler: async (_, context) => {
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });

      if (!session?.user) {
        return { count: 0 };
      }

      const count = await countUnreadNotifications(session.user.id);
      return { count };
    },
  }),

  /**
   * Marca una notificación como leída
   */
  markAsRead: defineAction({
    input: markReadSchema,
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

      const success = await markNotificationAsRead(id, session.user.id);
      return { success };
    },
  }),

  /**
   * Marca todas las notificaciones como leídas
   */
  markAllAsRead: defineAction({
    input: z.object({}),
    handler: async (_, context) => {
      const session = await auth.api.getSession({
        headers: context.request.headers,
      });

      if (!session?.user) {
        throw new ActionError({
          code: 'UNAUTHORIZED',
          message: 'Debes iniciar sesión.',
        });
      }

      const count = await markAllNotificationsAsRead(session.user.id);
      return { markedCount: count };
    },
  }),
};
