/**
 * Schema para Sistema de Notificaciones
 *
 * Notificaciones en tiempo real para usuarios sobre:
 * - Nuevas propuestas de cambios a sus documentos
 * - Aprobación/rechazo de sus propuestas
 * - Comentarios en propuestas
 */

import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth-schema';

// Tipos de notificación
export const notificationTypeEnum = pgEnum('notification_type', [
  'proposal_received', // Alguien propuso cambios a tu documento
  'proposal_approved', // Tu propuesta fue aprobada
  'proposal_rejected', // Tu propuesta fue rechazada
  'proposal_comment', // Comentario en una propuesta
]);

/**
 * Tabla de notificaciones
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    // Usuario destinatario
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),

    // Tipo de notificación
    type: notificationTypeEnum('type').notNull(),

    // Contenido
    title: text('title').notNull(),
    message: text('message').notNull(),

    // Link para navegar (ej: /proposal/[id])
    link: text('link'),

    // Datos adicionales en JSON (ej: proposalId, documentId)
    metadata: text('metadata'), // JSON string

    // Estado de lectura
    read: boolean('read').notNull().default(false),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    readAt: timestamp('read_at', { withTimezone: true, mode: 'date' }),
  },
  (table) => [
    index('idx_notifications_user_id').on(table.userId),
    index('idx_notifications_read').on(table.read),
    index('idx_notifications_created_at').on(table.createdAt),
    // Índice compuesto para notificaciones no leídas de un usuario
    index('idx_notifications_user_unread').on(table.userId, table.read),
  ],
);

// Tipos exportados
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationType =
  | 'proposal_received'
  | 'proposal_approved'
  | 'proposal_rejected'
  | 'proposal_comment';
