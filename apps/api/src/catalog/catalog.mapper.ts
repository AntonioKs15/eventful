const DOLLARS_TO_CENTS = 100;

interface TicketmasterImage {
  ratio?: string;
  width?: number;
  url?: string;
}

interface TicketmasterVenue {
  id?: string;
  name?: string;
  city?: { name?: string };
}

interface TicketmasterPriceRange {
  min?: number;
  max?: number;
}

interface TicketmasterEvent {
  id?: string;
  name?: string;
  dates?: { start?: { localDate?: string; localTime?: string } };
  classifications?: Array<{ genre?: { name?: string } }>;
  images?: TicketmasterImage[];
  priceRanges?: TicketmasterPriceRange[];
  _embedded?: { venues?: TicketmasterVenue[] };
}

export interface CatalogEventSummary {
  externalId: string;
  title: string;
  startDate: string | null;
  startTime: string | null;
  venueExternalId: string | null;
  venueName: string | null;
  venueCity: string | null;
  imageUrl: string | null;
  minPriceCents: number | null;
  maxPriceCents: number | null;
  genre: string | null;
}

function toCents(value: number | undefined): number | null {
  return value === undefined ? null : Math.round(value * DOLLARS_TO_CENTS);
}

function pickWidestSixteenByNineImage(
  images: TicketmasterImage[] | undefined,
): string | null {
  const candidates = (images ?? []).filter((image) => image.ratio === '16_9');
  const widest = candidates.reduce<TicketmasterImage | null>(
    (best, candidate) => {
      if (!best || (candidate.width ?? 0) > (best.width ?? 0)) {
        return candidate;
      }
      return best;
    },
    null,
  );

  return widest?.url ?? null;
}

export function mapTicketmasterEventToSummary(
  raw: unknown,
): CatalogEventSummary {
  const event = raw as TicketmasterEvent;
  const venue = event._embedded?.venues?.[0];
  const priceRange = event.priceRanges?.[0];

  return {
    externalId: event.id ?? '',
    title: event.name ?? '',
    startDate: event.dates?.start?.localDate ?? null,
    startTime: event.dates?.start?.localTime ?? null,
    venueExternalId: venue?.id ?? null,
    venueName: venue?.name ?? null,
    venueCity: venue?.city?.name ?? null,
    imageUrl: pickWidestSixteenByNineImage(event.images),
    minPriceCents: toCents(priceRange?.min),
    maxPriceCents: toCents(priceRange?.max),
    genre: event.classifications?.[0]?.genre?.name ?? null,
  };
}
