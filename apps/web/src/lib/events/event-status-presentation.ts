import { EventStatus } from "@eventful/contracts";
import { StatusTone } from "@/components/ui/status-pill";

const EVENT_STATUS_TONE: Record<EventStatus, StatusTone> = {
  [EventStatus.DRAFT]: "neutral",
  [EventStatus.PUBLISHED]: "positive",
  [EventStatus.CANCELLED]: "negative",
};

const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  [EventStatus.DRAFT]: "Draft",
  [EventStatus.PUBLISHED]: "Published",
  [EventStatus.CANCELLED]: "Cancelled",
};

export function eventStatusTone(status: EventStatus): StatusTone {
  return EVENT_STATUS_TONE[status];
}

export function eventStatusLabel(status: EventStatus): string {
  return EVENT_STATUS_LABEL[status];
}
