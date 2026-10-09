export type NotificationKind = 'reminder' | 'visit_change' | 'shared_inventory' | 'collaboration_request';

export interface NotificationPreferenceView {
  reminders: boolean;
  visitChanges: boolean;
  sharedInventory: boolean;
  collaborationRequests: boolean;
}

const DEFAULTS: NotificationPreferenceView = {
  reminders: true,
  visitChanges: true,
  sharedInventory: true,
  collaborationRequests: true,
};

export function defaultNotificationPreference(): NotificationPreferenceView {
  return { ...DEFAULTS };
}

export function preferenceAllows(prefs: NotificationPreferenceView, kind: NotificationKind): boolean {
  if (kind === 'reminder') return prefs.reminders;
  if (kind === 'visit_change') return prefs.visitChanges;
  if (kind === 'shared_inventory') return prefs.sharedInventory;
  return prefs.collaborationRequests;
}

export function notificationDedupeKey(kind: NotificationKind, entityId: string): string {
  return `${kind}:${entityId}`;
}
