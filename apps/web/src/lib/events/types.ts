import { EventLayoutType, EventStatus } from "@eventful/contracts";

export interface Venue {
  id: string;
  name: string;
  city: string;
  address: string;
}

export interface GeneralAdmissionPool {
  capacity: number;
  sold: number;
}

export interface SeatMapDimensions {
  rows: number;
  columns: number;
}

export interface EventMovieSummary {
  id: string;
  title: string;
  posterImageUrl: string;
  durationMinutes: number;
  ratingLabel: string;
}

export interface EventSummary {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  capacity: number;
  priceCents: number;
  layoutType: EventLayoutType;
  status: EventStatus;
  venue: Venue;
  movie: EventMovieSummary | null;
  generalAdmissionPool: GeneralAdmissionPool | null;
  seatMap: SeatMapDimensions | null;
}

export interface SeatAvailability {
  id: string;
  rowLabel: string;
  seatNumber: number;
  isAvailable: boolean;
}

export interface SeatAvailabilityMap {
  rows: number;
  columns: number;
  seats: SeatAvailability[];
}
