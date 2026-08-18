import { nanoid } from 'nanoid';

const TICKET_PUBLIC_CODE_LENGTH = 24;

export function generateTicketPublicCode(): string {
  return nanoid(TICKET_PUBLIC_CODE_LENGTH);
}
