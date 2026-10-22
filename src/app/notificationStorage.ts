export type NotificationKind =
  | "advisor"
  | "benchmark"
  | "intelligence"
  | "initiative"
  | "system";

export type NotificationAction =
  | {
      type: "advisor_connection_review";
      label: string;
      companyId: string;
    }
  | {
      type: "company_advisor_invite_review";
      label: string;
      linkId: string;
    }
  | {
      type: "navigate";
      label: string;
      page: string;
    }
  | {
      type: "external_link";
      label: string;
      href: string;
    };

export type WorkspaceNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  createdAt: number;
  readAt?: number;
  dismissedAt?: number;
  action?: NotificationAction;
  sourceLabel?: string;
};

const STORAGE_KEY = "fuel-workspace-notifications:v1";
export const NOTIFICATIONS_CHANGED_EVENT = "fuel-workspace-notifications-changed";

function readAll(): WorkspaceNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as WorkspaceNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(notifications: WorkspaceNotification[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
  } catch {
    /* Preview environments can block local storage. */
  }
}

export function loadNotifications(options?: { includeDismissed?: boolean }): WorkspaceNotification[] {
  const notifications = readAll()
    .filter(notification => options?.includeDismissed || !notification.dismissedAt);
  return notifications.sort((a, b) => b.createdAt - a.createdAt);
}

export function loadArchivedNotifications(): WorkspaceNotification[] {
  return readAll()
    .filter(notification => Boolean(notification.dismissedAt))
    .sort((a, b) => (b.dismissedAt ?? b.createdAt) - (a.dismissedAt ?? a.createdAt));
}

export function upsertNotification(
  notification: Omit<WorkspaceNotification, "createdAt"> & { createdAt?: number },
): WorkspaceNotification {
  const notifications = readAll();
  const index = notifications.findIndex(item => item.id === notification.id);
  const current = index >= 0 ? notifications[index] : null;
  const next: WorkspaceNotification = {
    ...current,
    ...notification,
    createdAt: current?.createdAt ?? notification.createdAt ?? Date.now(),
  };
  if (index >= 0) notifications[index] = next;
  else notifications.push(next);
  writeAll(notifications);
  return next;
}

export function markNotificationRead(id: string): WorkspaceNotification | null {
  const notifications = readAll();
  const index = notifications.findIndex(item => item.id === id);
  if (index < 0) return null;
  const next = { ...notifications[index], readAt: notifications[index].readAt ?? Date.now() };
  notifications[index] = next;
  writeAll(notifications);
  return next;
}

export function markAllNotificationsRead() {
  const now = Date.now();
  writeAll(readAll().map(notification => (
    notification.dismissedAt || notification.readAt
      ? notification
      : { ...notification, readAt: now }
  )));
}

export function dismissNotification(id: string) {
  const notifications = readAll();
  const index = notifications.findIndex(item => item.id === id);
  if (index < 0) return;
  notifications[index] = {
    ...notifications[index],
    readAt: notifications[index].readAt ?? Date.now(),
    dismissedAt: Date.now(),
  };
  writeAll(notifications);
}

export function restoreNotification(id: string) {
  const notifications = readAll();
  const index = notifications.findIndex(item => item.id === id);
  if (index < 0) return;
  const { dismissedAt: _dismissed, ...rest } = notifications[index];
  notifications[index] = rest;
  writeAll(notifications);
}

export function removeNotification(id: string) {
  writeAll(readAll().filter(notification => notification.id !== id));
}

export function resetNotificationsForKind(kind: NotificationKind) {
  writeAll(readAll().filter(notification => notification.kind !== kind));
}
