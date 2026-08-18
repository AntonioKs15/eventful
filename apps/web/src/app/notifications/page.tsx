"use client";

import { PAGINATION_DEFAULTS, UserRole } from "@eventful/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useState } from "react";
import { AuthGuard } from "@/lib/auth/auth-guard";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { Pagination } from "@/components/ui/pagination";
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/notifications/notifications-api";
import { Notification } from "@/lib/notifications/types";

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function NotificationsContent() {
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.PAGE);
  const queryClient = useQueryClient();

  const { data, isPending, error } = useQuery({
    queryKey: ["notifications", { page }],
    queryFn: () => listMyNotifications({ page, pageSize: PAGINATION_DEFAULTS.PAGE_SIZE }),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-bold text-foreground">Notifications</h1>
        {data && data.data.some((notification) => !notification.readAt) ? (
          <button
            type="button"
            onClick={() => markAllRead.mutate()}
            className="focus-ring text-sm text-accent hover:underline"
          >
            Mark all as read
          </button>
        ) : null}
      </div>

      <ApiErrorNotice error={error} />

      <NotificationsResults
        isPending={isPending}
        data={data}
        onPageChange={setPage}
        onMarkRead={(id) => markRead.mutate(id)}
      />
    </div>
  );
}

function NotificationsResults({
  isPending,
  data,
  onPageChange,
  onMarkRead,
}: {
  isPending: boolean;
  data: Awaited<ReturnType<typeof listMyNotifications>> | undefined;
  onPageChange: (page: number) => void;
  onMarkRead: (id: string) => void;
}) {
  if (isPending) {
    return <p className="text-surface-500">Loading notifications…</p>;
  }

  if (!data || data.data.length === 0) {
    return <EmptyState title="No notification yet" description="We'll let you know when something happens." />;
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {data.data.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            onMarkRead={() => onMarkRead(notification.id)}
          />
        ))}
      </div>
      <Pagination meta={data.meta} onPageChange={onPageChange} />
    </>
  );
}

function NotificationRow({
  notification,
  onMarkRead,
}: {
  notification: Notification;
  onMarkRead: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!notification.readAt) {
          onMarkRead();
        }
      }}
      className={`focus-ring flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
        notification.readAt ? "border-surface-700" : "border-accent/40 bg-accent/5"
      }`}
    >
      <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${notification.readAt ? "text-surface-500" : "text-accent"}`} />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">{notification.title}</p>
        <p className="text-sm text-surface-400">{notification.message}</p>
        <p className="text-xs text-surface-500">{formatRelativeTime(notification.createdAt)}</p>
      </div>
    </button>
  );
}

export default function NotificationsPage() {
  return (
    <AuthGuard allow={[UserRole.CUSTOMER, UserRole.ORGANIZER, UserRole.GATE]}>
      <NotificationsContent />
    </AuthGuard>
  );
}
