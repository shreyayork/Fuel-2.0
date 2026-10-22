import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogA11y } from "./a11y/useDialogA11y.ts";
import { drawerPanelPointerProps, useScrimPointerClose } from "./drawerScrim.ts";
import { FuelIcon } from "./icons.tsx";
import {
  NOTIFICATIONS_CHANGED_EVENT,
  dismissNotification,
  loadArchivedNotifications,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  restoreNotification,
  type NotificationAction,
  type WorkspaceNotification,
} from "./notificationStorage.ts";
import "./notifications.css";

function relativeTime(timestamp: number) {
  const elapsed = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

type NotificationDrawerTab = "inbox" | "archived";

function NotificationEmptyState({ archivedHint }: { archivedHint?: number }) {
  return (
    <div className="notification-empty">
      <FuelIcon name="bell" size={20} />
      <strong>You’re all caught up</strong>
      <span>New workspace updates and actions will appear here.</span>
      {archivedHint && archivedHint > 0 ? (
        <span className="notification-empty-archived-hint">
          {archivedHint} archived {archivedHint === 1 ? "update" : "updates"} in the drawer.
        </span>
      ) : null}
    </div>
  );
}

function NotificationItem({
  notification,
  archived,
  onAction,
  onDismiss,
  onRestore,
}: {
  notification: WorkspaceNotification;
  archived?: boolean;
  onAction: (notification: WorkspaceNotification) => void;
  onDismiss?: (id: string) => void;
  onRestore?: (id: string) => void;
}) {
  return (
    <article
      className={`notification-item${notification.readAt ? "" : " is-unread"}${archived ? " is-archived" : ""}`}
      onClick={() => markNotificationRead(notification.id)}
    >
      <span className={`notification-kind notification-kind--${notification.kind}`} aria-hidden="true" />
      <div className="notification-item-content">
        <div className="notification-item-meta">
          <span>{notification.sourceLabel ?? notification.kind}</span>
          <time dateTime={new Date(notification.createdAt).toISOString()}>
            {relativeTime(archived && notification.dismissedAt ? notification.dismissedAt : notification.createdAt)}
          </time>
        </div>
        <h3>{notification.title}</h3>
        <p>{notification.message}</p>
        {archived ? (
          <span className="notification-archived-label">Archived</span>
        ) : null}
        {!archived && notification.action ? (
          <button type="button" onClick={event => {
            event.stopPropagation();
            onAction(notification);
          }}>
            {notification.action.label}
          </button>
        ) : null}
        {archived && onRestore ? (
          <button
            type="button"
            className="notification-restore-btn"
            onClick={event => {
              event.stopPropagation();
              onRestore(notification.id);
            }}
          >
            Restore to inbox
          </button>
        ) : null}
      </div>
      {!archived && notification.readAt && onDismiss ? (
        <button
          type="button"
          className="notification-dismiss"
          aria-label={`Dismiss ${notification.title}`}
          onClick={event => {
            event.stopPropagation();
            onDismiss(notification.id);
          }}
        >
          <FuelIcon name="close" size={13} />
        </button>
      ) : null}
    </article>
  );
}

function NotificationDrawer({
  open,
  tab,
  inbox,
  archived,
  unreadCount,
  onClose,
  onTabChange,
  onAction,
  onDismiss,
  onRestore,
  onMarkAllRead,
}: {
  open: boolean;
  tab: NotificationDrawerTab;
  inbox: WorkspaceNotification[];
  archived: WorkspaceNotification[];
  unreadCount: number;
  onClose: () => void;
  onTabChange: (tab: NotificationDrawerTab) => void;
  onAction: (notification: WorkspaceNotification) => void;
  onDismiss: (id: string) => void;
  onRestore: (id: string) => void;
  onMarkAllRead: () => void;
}) {
  const drawerRef = useRef<HTMLElement>(null);
  const handleScrimPointerDown = useScrimPointerClose(onClose, open);
  useDialogA11y(open, drawerRef, onClose);

  if (!open) return null;

  const list = tab === "inbox" ? inbox : archived;

  return createPortal(
    <div
      className="notification-drawer-scrim"
      onPointerDown={handleScrimPointerDown}
      role="presentation"
    >
      <aside
        ref={drawerRef}
        className="notification-drawer overview-panel"
        {...drawerPanelPointerProps()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-drawer-title"
      >
        <header className="notification-drawer-head">
          <div>
            <span>Workspace</span>
            <h2 id="notification-drawer-title">Notifications</h2>
          </div>
          <button
            type="button"
            className="notification-drawer-close"
            aria-label="Close notifications"
            data-autofocus
            onClick={onClose}
          >
            <FuelIcon name="close" size={16} />
          </button>
        </header>

        <div className="notification-drawer-tabs" role="tablist" aria-label="Notification views">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "inbox"}
            className={tab === "inbox" ? "is-active" : ""}
            onClick={() => onTabChange("inbox")}
          >
            Inbox
            {unreadCount > 0 ? <em>{unreadCount}</em> : null}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "archived"}
            className={tab === "archived" ? "is-active" : ""}
            onClick={() => onTabChange("archived")}
          >
            Archived
            {archived.length > 0 ? <em>{archived.length}</em> : null}
          </button>
        </div>

        <div className="notification-drawer-toolbar">
          {tab === "inbox" && unreadCount > 0 ? (
            <button type="button" onClick={onMarkAllRead}>Mark all read</button>
          ) : (
            <span>{tab === "inbox" ? "Active updates and actions" : "Dismissed notifications"}</span>
          )}
        </div>

        <div className="notification-drawer-list">
          {list.length === 0 ? (
            tab === "inbox" ? (
              <NotificationEmptyState archivedHint={archived.length} />
            ) : (
              <div className="notification-empty">
                <FuelIcon name="bell" size={20} />
                <strong>No archived notifications</strong>
                <span>Dismiss read items from your inbox to archive them here.</span>
              </div>
            )
          ) : list.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              archived={tab === "archived"}
              onAction={onAction}
              onDismiss={tab === "inbox" ? onDismiss : undefined}
              onRestore={tab === "archived" ? onRestore : undefined}
            />
          ))}
        </div>
      </aside>
    </div>,
    document.body,
  );
}

export function NotificationCenter({
  tourActive = false,
  onAction,
}: {
  tourActive?: boolean;
  onAction?: (action: NotificationAction, notification: WorkspaceNotification) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<NotificationDrawerTab>("inbox");
  const [notifications, setNotifications] = useState(() => loadNotifications());
  const [archived, setArchived] = useState(() => loadArchivedNotifications());

  const refresh = () => {
    setNotifications(loadNotifications());
    setArchived(loadArchivedNotifications());
  };

  useEffect(() => {
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const unreadCount = useMemo(
    () => notifications.filter(notification => !notification.readAt).length,
    [notifications],
  );

  const openDrawer = (tab: NotificationDrawerTab = "inbox") => {
    setDrawerTab(tab);
    setDrawerOpen(true);
    setOpen(false);
  };

  const runAction = (notification: WorkspaceNotification) => {
    markNotificationRead(notification.id);
    if (!notification.action) return;
    if (notification.action.type === "external_link") {
      window.open(notification.action.href, "_blank", "noopener,noreferrer");
    } else {
      onAction?.(notification.action, notification);
    }
    setOpen(false);
    setDrawerOpen(false);
  };

  return (
    <>
      <div
        ref={rootRef}
        className={`notification-center${tourActive ? " tour-highlight" : ""}`}
        data-tour-target={tourActive ? "notifications" : undefined}
      >
        <button
          type="button"
          className={`notification-bell${open ? " is-open" : ""}`}
          aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen(value => !value)}
        >
          <FuelIcon name="bell" size={17} />
          {unreadCount > 0 ? (
            <span className="notification-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
          ) : null}
        </button>

        {open ? (
          <section className="notification-panel overview-panel" role="dialog" aria-label="Notifications">
            <header className="notification-panel-head">
              <div>
                <span>Updates</span>
                <h2>Notifications</h2>
              </div>
              <div className="notification-panel-actions">
                <button
                  type="button"
                  className="notification-panel-expand"
                  aria-label="Open notifications in sidebar"
                  title="Open in sidebar"
                  onClick={() => openDrawer("inbox")}
                >
                  <FuelIcon name="layoutGrid" size={15} />
                </button>
                {unreadCount > 0 ? (
                  <button type="button" onClick={markAllNotificationsRead}>Mark all read</button>
                ) : null}
              </div>
            </header>

            {archived.length > 0 ? (
              <button
                type="button"
                className="notification-archived-bar"
                onClick={() => openDrawer("archived")}
              >
                <span>Archived</span>
                <strong>{archived.length}</strong>
                <FuelIcon name="chevronDown" size={14} className="notification-archived-bar-chevron" />
              </button>
            ) : null}

            <div className="notification-list">
              {notifications.length === 0 ? (
                <NotificationEmptyState archivedHint={archived.length} />
              ) : notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onAction={runAction}
                  onDismiss={dismissNotification}
                />
              ))}
            </div>

            <footer className="notification-panel-foot">
              <button type="button" className="notification-panel-open-drawer" onClick={() => openDrawer("inbox")}>
                Open full inbox
              </button>
            </footer>
          </section>
        ) : null}
      </div>

      <NotificationDrawer
        open={drawerOpen}
        tab={drawerTab}
        inbox={notifications}
        archived={archived}
        unreadCount={unreadCount}
        onClose={() => setDrawerOpen(false)}
        onTabChange={setDrawerTab}
        onAction={runAction}
        onDismiss={dismissNotification}
        onRestore={restoreNotification}
        onMarkAllRead={markAllNotificationsRead}
      />
    </>
  );
}
