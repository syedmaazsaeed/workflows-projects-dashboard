'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatRelativeTime } from '@/lib/utils';
import {
  Bell,
  FolderKanban,
  Workflow,
  Webhook,
  FileText,
  User,
  Check,
  X,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'project' | 'workflow' | 'webhook' | 'document' | 'user';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const iconMap = {
  project: FolderKanban,
  workflow: Workflow,
  webhook: Webhook,
  document: FileText,
  user: User,
};

const colorMap = {
  project: 'text-blue-600 dark:text-blue-500 bg-blue-500/10 dark:bg-blue-500/10',
  workflow: 'text-purple-600 dark:text-purple-500 bg-purple-500/10 dark:bg-purple-500/10',
  webhook: 'text-green-600 dark:text-green-500 bg-green-500/10 dark:bg-green-500/10',
  document: 'text-orange-600 dark:text-orange-500 bg-orange-500/10 dark:bg-orange-500/10',
  user: 'text-gray-600 dark:text-gray-500 bg-gray-500/10 dark:bg-gray-500/10',
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'workflow',
      title: 'Workflow Updated',
      message: 'Customer Notification Flow was updated to v2',
      time: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      read: false,
    },
    {
      id: '2',
      type: 'webhook',
      title: 'Webhook Triggered',
      message: 'github-events received 3 new events',
      time: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      read: false,
    },
    {
      id: '3',
      type: 'project',
      title: 'New Project',
      message: 'Test Automation Project was created',
      time: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      read: true,
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearAll = () => {
    setNotifications([]);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center h-9 w-9 rounded-lg bg-muted/50 hover:bg-muted border border-border transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-xl border border-border bg-card text-card-foreground shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-[400px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  No notifications
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => {
                    const Icon = iconMap[notification.type];
                    const colors = colorMap[notification.type];
                    return (
                      <div
                        key={notification.id}
                        onClick={() => markAsRead(notification.id)}
                        className={`flex gap-3 p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                          !notification.read ? 'bg-primary/5' : ''
                        }`}
                      >
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${colors}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="h-2 w-2 rounded-full bg-primary" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(notification.time)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-border p-2">
                <button
                  onClick={clearAll}
                  className="w-full rounded-lg py-2 text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

