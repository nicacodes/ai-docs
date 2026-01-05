/**
 * Repositorio de Notificaciones
 *
 * Funciones de base de datos para gestionar notificaciones.
 */

import { and, desc, eq, sql } from 'drizzle-orm';
import { getDb } from './client';
import { notifications, type NotificationType } from './notifications-schema';

// ============================================================================
// Types
// ============================================================================

export interface NotificationRow {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  metadata: string | null;
  read: boolean;
  createdAt: Date;
  readAt: Date | null;
}

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Obtiene notificaciones de un usuario
 */
export async function listNotifications(
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {},
): Promise<NotificationRow[]> {
  const { limit = 20, unreadOnly = false } = options;
  const db = getDb();

  const conditions = [eq(notifications.userId, userId)];
  if (unreadOnly) {
    conditions.push(eq(notifications.read, false));
  }

  const rows = await db
    .select({
      id: notifications.id,
      userId: notifications.userId,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      link: notifications.link,
      metadata: notifications.metadata,
      read: notifications.read,
      createdAt: notifications.createdAt,
      readAt: notifications.readAt,
    })
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  return rows as NotificationRow[];
}

/**
 * Cuenta notificaciones no leídas de un usuario
 */
export async function countUnreadNotifications(
  userId: string,
): Promise<number> {
  const db = getDb();

  const result = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), eq(notifications.read, false)),
    );

  return result[0]?.count ?? 0;
}

/**
 * Obtiene una notificación por ID
 */
export async function getNotificationById(
  id: string,
): Promise<NotificationRow | null> {
  const db = getDb();

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.id, id))
    .limit(1);

  return (rows[0] as NotificationRow | undefined) ?? null;
}

// ============================================================================
// Mutations
// ============================================================================

/**
 * Crea una nueva notificación
 */
export async function createNotification(
  input: CreateNotificationInput,
): Promise<{ id: string }> {
  const db = getDb();

  const inserted = await db
    .insert(notifications)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    })
    .returning({ id: notifications.id });

  return inserted[0]!;
}

/**
 * Marca una notificación como leída
 */
export async function markNotificationAsRead(
  id: string,
  userId: string,
): Promise<boolean> {
  const db = getDb();

  const result = await db
    .update(notifications)
    .set({
      read: true,
      readAt: new Date(),
    })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
    .returning({ id: notifications.id });

  return result.length > 0;
}

/**
 * Marca todas las notificaciones de un usuario como leídas
 */
export async function markAllNotificationsAsRead(
  userId: string,
): Promise<number> {
  const db = getDb();

  const result = await db
    .update(notifications)
    .set({
      read: true,
      readAt: new Date(),
    })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)))
    .returning({ id: notifications.id });

  return result.length;
}

/**
 * Elimina notificaciones antiguas (más de 30 días)
 */
export async function deleteOldNotifications(
  daysOld: number = 30,
): Promise<number> {
  const db = getDb();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  const result = await db
    .delete(notifications)
    .where(sql`${notifications.createdAt} < ${cutoffDate}`)
    .returning({ id: notifications.id });

  return result.length;
}

// ============================================================================
// Helpers para crear notificaciones específicas
// ============================================================================

/**
 * Notifica al autor que recibió una propuesta
 */
export async function notifyProposalReceived(
  authorId: string,
  proposerName: string,
  documentTitle: string,
  proposalId: string,
): Promise<{ id: string }> {
  return createNotification({
    userId: authorId,
    type: 'proposal_received',
    title: 'Nueva propuesta de cambios',
    message: `${proposerName} propuso cambios a "${documentTitle}"`,
    link: `/proposals/${proposalId}`,
    metadata: { proposalId },
  });
}

/**
 * Notifica al proponente que su propuesta fue aprobada
 */
export async function notifyProposalApproved(
  proposerId: string,
  documentTitle: string,
  documentSlug: string,
  proposalId: string,
): Promise<{ id: string }> {
  return createNotification({
    userId: proposerId,
    type: 'proposal_approved',
    title: 'Propuesta aprobada ✓',
    message: `Tu propuesta para "${documentTitle}" fue aprobada`,
    link: `/post/${documentSlug}`,
    metadata: { proposalId, documentSlug },
  });
}

/**
 * Notifica al proponente que su propuesta fue rechazada
 */
export async function notifyProposalRejected(
  proposerId: string,
  documentTitle: string,
  proposalId: string,
  reason?: string,
): Promise<{ id: string }> {
  return createNotification({
    userId: proposerId,
    type: 'proposal_rejected',
    title: 'Propuesta rechazada',
    message: reason
      ? `Tu propuesta para "${documentTitle}" fue rechazada: ${reason}`
      : `Tu propuesta para "${documentTitle}" fue rechazada`,
    link: `/proposals/${proposalId}`,
    metadata: { proposalId },
  });
}
