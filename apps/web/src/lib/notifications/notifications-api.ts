import { PaginatedResult } from "@eventful/contracts";
import { apiRequest } from "../api/api-client";
import { Notification } from "./types";

export function listMyNotifications(query: {
  page: number;
  pageSize: number;
}): Promise<PaginatedResult<Notification>> {
  return apiRequest("/notifications/mine", {
    query: { page: query.page, pageSize: query.pageSize },
  });
}

export function getUnreadCount(): Promise<{ count: number }> {
  return apiRequest("/notifications/unread-count");
}

export function markNotificationRead(id: string): Promise<Notification> {
  return apiRequest(`/notifications/${id}/read`, { method: "PATCH" });
}

export function markAllNotificationsRead(): Promise<void> {
  return apiRequest("/notifications/read-all", { method: "PATCH" });
}
