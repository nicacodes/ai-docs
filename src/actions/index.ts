import { documentsActions } from './documents';
import { proposalsActions } from './proposals';
import { notificationsActions } from './notifications';

export const server = {
  documents: documentsActions,
  proposals: proposalsActions,
  notifications: notificationsActions,
};
