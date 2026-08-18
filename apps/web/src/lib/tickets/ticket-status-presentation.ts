import { TicketStatus } from "@eventful/contracts";
import { StatusTone } from "@/components/ui/status-pill";

const TICKET_STATUS_TONE: Record<TicketStatus, StatusTone> = {
  [TicketStatus.ISSUED]: "positive",
  [TicketStatus.USED]: "neutral",
  [TicketStatus.CANCELLED]: "negative",
};

const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  [TicketStatus.ISSUED]: "Ready to scan",
  [TicketStatus.USED]: "Used",
  [TicketStatus.CANCELLED]: "Cancelled",
};

export function ticketStatusTone(status: TicketStatus): StatusTone {
  return TICKET_STATUS_TONE[status];
}

export function ticketStatusLabel(status: TicketStatus): string {
  return TICKET_STATUS_LABEL[status];
}
