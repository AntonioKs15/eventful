import { EventLayoutType, EventSortBy, PaginatedResult } from "@eventful/contracts";
import { apiRequest } from "../api/api-client";
import { EventSummary, SeatAvailabilityMap } from "./types";

export interface ListEventsQuery {
  city?: string;
  sortBy?: EventSortBy;
  page: number;
  pageSize: number;
}

export interface CreateEventVenueInput {
  id?: string;
  name?: string;
  city?: string;
  address?: string;
  externalId?: string;
}

export interface CreateEventInput {
  title: string;
  description: string;
  startsAt: string;
  capacity: number;
  priceCents: number;
  layoutType: EventLayoutType;
  venue: CreateEventVenueInput;
  seatMap?: { rows: number; columns: number };
  catalogSourceId?: string;
}

export function listPublishedEvents(
  query: ListEventsQuery,
): Promise<PaginatedResult<EventSummary>> {
  return apiRequest("/events", {
    query: { city: query.city, sortBy: query.sortBy, page: query.page, pageSize: query.pageSize },
  });
}

export function getEvent(id: string): Promise<EventSummary> {
  return apiRequest(`/events/${id}`);
}

export function getSeatAvailability(id: string): Promise<SeatAvailabilityMap | null> {
  return apiRequest(`/events/${id}/seats`);
}

export function createEvent(input: CreateEventInput): Promise<EventSummary> {
  return apiRequest("/events", { method: "POST", body: input });
}

export function listMyEvents(
  query: Pick<ListEventsQuery, "page" | "pageSize">,
): Promise<PaginatedResult<EventSummary>> {
  return apiRequest("/events/mine", { query: { page: query.page, pageSize: query.pageSize } });
}

export function publishEvent(id: string): Promise<EventSummary> {
  return apiRequest(`/events/${id}/publish`, { method: "PATCH" });
}
