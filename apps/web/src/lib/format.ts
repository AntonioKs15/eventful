const CENTS_PER_UNIT = 100;

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

export function formatPriceCents(priceCents: number): string {
  return priceFormatter.format(priceCents / CENTS_PER_UNIT);
}

export function formatEventDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

export function formatEventTime(isoDate: string): string {
  return timeFormatter.format(new Date(isoDate));
}

const dayNumberFormatter = new Intl.DateTimeFormat("en-US", { day: "numeric" });
const weekdayShortFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short" });

export function formatDayNumber(isoDate: string): string {
  return dayNumberFormatter.format(new Date(isoDate));
}

export function formatWeekdayShort(isoDate: string): string {
  return weekdayShortFormatter.format(new Date(isoDate));
}

export function toDateKey(isoDate: string): string {
  return new Date(isoDate).toDateString();
}
