import { documentsActions } from './documents';
import { proposalsActions } from './proposals';
import { notificationsActions } from './notifications';
import { tagsActions } from './tags';

export const server = {
  documents: documentsActions,
  proposals: proposalsActions,
  notifications: notificationsActions,
  tags: tagsActions,
};
