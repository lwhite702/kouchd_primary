"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Landmark,
  Megaphone,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";

export type NotificationItem = {
  id: string;
  type: "payment" | "chore" | "agreement" | "announcement" | "system";
  urgency: "urgent" | "notice" | "info";
  title: string;
  description: string;
  timestamp?: string;
  actionLabel?: string;
  onAction?: () => void;
  confirmAction?: () => void;
  confirmLabel?: string;
};

interface DashboardNotificationFeedProps {
  notifications: NotificationItem[];
  onOpenSettings?: () => void;
  title?: string;
}

export function DashboardNotificationFeed({
  notifications,
  onOpenSettings,
  title = "Household Notifications",
}: DashboardNotificationFeedProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeItems = useMemo(
    () => notifications.filter((item) => !dismissedIds.has(item.id)),
    [notifications, dismissedIds]
  );

  const dismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  if (activeItems.length === 0) {
    return (
      <div className="notification-empty-banner" role="status">
        <div className="notification-empty-copy">
          <CheckCircle2 size={18} className="notification-status-icon success" />
          <span><strong>All clear!</strong> Your household ledger, chores, and agreements are up to date.</span>
        </div>
        {onOpenSettings && (
          <button
            type="button"
            className="text-button compact"
            onClick={onOpenSettings}
            title="Manage delivery channels"
          >
            Notification settings
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="dashboard-notification-card" aria-label={title}>
      <div className="notification-header">
        <div className="notification-title-wrap">
          <div className="notification-bell-icon">
            <Bell size={17} />
          </div>
          <div>
            <h3>{title}</h3>
            <span className="notification-subhead">
              {activeItems.length} active alert{activeItems.length === 1 ? "" : "s"} requiring attention
            </span>
          </div>
        </div>
        <div className="notification-header-actions">
          <span className="notification-badge-count">{activeItems.length}</span>
          {onOpenSettings && (
            <button
              type="button"
              className="icon-button compact notification-settings-trigger"
              onClick={onOpenSettings}
              aria-label="Notification delivery preferences"
              title="Reminder delivery preferences"
            >
              <Settings size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="notification-list">
        {activeItems.map((item) => (
          <article
            key={item.id}
            className={`notification-item urgency-${item.urgency}`}
            role="alert"
          >
            <div className="notification-item-icon">
              {item.type === "payment" && <Landmark size={18} />}
              {item.type === "chore" && <ClipboardList size={18} />}
              {item.type === "agreement" && <Users size={18} />}
              {item.type === "announcement" && <Megaphone size={18} />}
              {item.type === "system" && <Sparkles size={18} />}
            </div>

            <div className="notification-item-body">
              <div className="notification-item-headline">
                <strong>{item.title}</strong>
                {item.timestamp && <span className="notification-timestamp">{item.timestamp}</span>}
              </div>
              <p className="notification-item-desc">{item.description}</p>

              {(item.actionLabel || item.confirmLabel) && (
                <div className="notification-item-actions">
                  {item.confirmAction && (
                    <button
                      type="button"
                      className="button primary compact"
                      onClick={() => {
                        item.confirmAction?.();
                        dismiss(item.id);
                      }}
                    >
                      <Check size={14} /> {item.confirmLabel ?? "Confirm"}
                    </button>
                  )}
                  {item.onAction && (
                    <button
                      type="button"
                      className="button soft compact"
                      onClick={item.onAction}
                    >
                      {item.actionLabel} <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="notification-dismiss-btn"
              onClick={() => dismiss(item.id)}
              aria-label={`Dismiss notification: ${item.title}`}
              title="Dismiss notification"
            >
              <X size={15} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

interface NotificationBellMenuProps {
  notifications: NotificationItem[];
  onOpenSettings?: () => void;
}

export function NotificationBellMenu({
  notifications,
  onOpenSettings,
}: NotificationBellMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeItems = useMemo(
    () => notifications.filter((item) => !dismissedIds.has(item.id)),
    [notifications, dismissedIds]
  );

  const dismiss = (id: string) => {
    setDismissedIds((prev) => new Set([...prev, id]));
  };

  const clearAll = () => {
    setDismissedIds(new Set(notifications.map((n) => n.id)));
  };

  return (
    <div className="notification-bell-menu-wrap">
      <button
        type="button"
        className="icon-button compact notification-bell-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications${activeItems.length > 0 ? ` (${activeItems.length} unread)` : ""}`}
        aria-expanded={isOpen}
        title="Household notifications"
      >
        <Bell size={18} />
        {activeItems.length > 0 && (
          <span className="bell-badge-count" aria-hidden="true">
            {activeItems.length > 9 ? "9+" : activeItems.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="notification-popover-scrim"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="notification-popover"
            role="dialog"
            aria-label="Household Notifications"
          >
            <div className="notification-popover-topline">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong>Notifications</strong>
                <span className="notification-badge-count">{activeItems.length}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {activeItems.length > 0 && (
                  <button
                    type="button"
                    className="text-button compact"
                    onClick={clearAll}
                    style={{ fontSize: "0.78rem" }}
                  >
                    Clear all
                  </button>
                )}
                {onOpenSettings && (
                  <button
                    type="button"
                    className="icon-button compact"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenSettings();
                    }}
                    aria-label="Notification delivery settings"
                    title="Notification settings"
                  >
                    <Settings size={16} />
                  </button>
                )}
                <button
                  type="button"
                  className="icon-button compact"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close notifications popover"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="notification-popover-feed">
              {activeItems.length === 0 ? (
                <div className="notification-popover-empty">
                  <CheckCircle2 size={24} color="var(--green, #184f3a)" />
                  <p><strong>You&apos;re all caught up!</strong></p>
                  <span>No unconfirmed contributions, overdue charges, or pending chores.</span>
                </div>
              ) : (
                activeItems.map((item) => (
                  <article
                    key={item.id}
                    className={`notification-popover-item urgency-${item.urgency}`}
                  >
                    <div className="notification-popover-item-icon">
                      {item.type === "payment" && <Landmark size={15} />}
                      {item.type === "chore" && <ClipboardList size={15} />}
                      {item.type === "agreement" && <Users size={15} />}
                      {item.type === "announcement" && <Megaphone size={15} />}
                      {item.type === "system" && <Sparkles size={15} />}
                    </div>
                    <div className="notification-popover-item-content">
                      <div className="notification-popover-item-title">
                        <strong>{item.title}</strong>
                        <button
                          type="button"
                          className="notification-dismiss-mini"
                          onClick={() => dismiss(item.id)}
                          aria-label="Dismiss"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <p>{item.description}</p>
                      {(item.actionLabel || item.confirmLabel) && (
                        <div className="notification-item-actions" style={{ marginTop: 6 }}>
                          {item.confirmAction && (
                            <button
                              type="button"
                              className="button primary compact"
                              style={{ fontSize: "0.76rem", padding: "4px 10px" }}
                              onClick={() => {
                                item.confirmAction?.();
                                dismiss(item.id);
                              }}
                            >
                              <Check size={12} /> {item.confirmLabel ?? "Confirm"}
                            </button>
                          )}
                          {item.onAction && (
                            <button
                              type="button"
                              className="button soft compact"
                              style={{ fontSize: "0.76rem", padding: "4px 10px" }}
                              onClick={() => {
                                item.onAction?.();
                                setIsOpen(false);
                              }}
                            >
                              {item.actionLabel}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>

            <div className="notification-popover-footer">
              <span style={{ fontSize: "0.76rem", color: "var(--muted)" }}>
                Delivered via Kouchd in-app, SMS &amp; email
              </span>
              {onOpenSettings && (
                <button
                  type="button"
                  className="text-button compact"
                  style={{ fontSize: "0.78rem" }}
                  onClick={() => {
                    setIsOpen(false);
                    onOpenSettings();
                  }}
                >
                  Manage channels
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
