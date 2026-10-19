import React, { useEffect, useMemo, useRef, useState } from "react";
import { FuelIcon } from "./icons.tsx";
import {
  NOTIFICATIONS_CHANGED_EVENT,
  dismissNotification,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
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

export function NotificationCenter({
  tourActive = false,
  onAction,
}: {
  tourActive?: boolean;
  onAction?: (action: NotificationAction, notification: WorkspaceNotification) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(() => loadNotifications());

  useEffect(() => {
    const refresh = () => setNotifications(loadNotifications());
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

  const runAction = (notification: WorkspaceNotification) => {
    markNotificationRead(notification.id);
    if (!notification.action) return;
    if (notification.action.type === "external_link") {
      window.open(notification.action.href, "_blank", "noopener,noreferrer");
    } else {
      onAction?.(notification.action, notification);
    }
    setOpen(false);
  };

  return (
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
            {unreadCount > 0 ? (
              <button type="button" onClick={markAllNotificationsRead}>Mark all read</button>
            ) : null}
          </header>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <FuelIcon name="bell" size={20} />
                <strong>You’re all caught up</strong>
                <span>New workspace updates and actions will appear here.</span>
              </div>
            ) : notifications.map(notification => (
              <article
                key={notification.id}
                className={`notification-item${notification.readAt ? "" : " is-unread"}`}
                onClick={() => markNotificationRead(notification.id)}
              >
                <span className={`notification-kind notification-kind--${notification.kind}`} aria-hidden="true" />
                <div className="notification-item-content">
                  <div className="notification-item-meta">
                    <span>{notification.sourceLabel ?? notification.kind}</span>
                    <time dateTime={new Date(notification.createdAt).toISOString()}>
                      {relativeTime(notification.createdAt)}
                    </time>
                  </div>
                  <h3>{notification.title}</h3>
                  <p>{notification.message}</p>
                  {notification.action ? (
                    <button type="button" onClick={event => {
                      event.stopPropagation();
                      runAction(notification);
                    }}>
                      {notification.action.label}
                    </button>
                  ) : null}
                </div>
                {notification.readAt ? (
                  <button
                    type="button"
                    className="notification-dismiss"
                    aria-label={`Dismiss ${notification.title}`}
                    onClick={event => {
                      event.stopPropagation();
                      dismissNotification(notification.id);
                    }}
                  >
                    <FuelIcon name="close" size={13} />
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
