import { SeatAvailability, SeatAvailabilityMap } from "@/lib/events/types";
import { toggleSeatSelection } from "@/lib/reservations/toggle-seat-selection";

type SeatVisualState = "taken" | "selected" | "available";

const SEAT_STATE_LABEL: Record<SeatVisualState, string> = {
  taken: ", taken",
  selected: ", selected",
  available: ", available",
};

const SEAT_STATE_CLASSNAME: Record<SeatVisualState, string> = {
  taken: "cursor-not-allowed bg-surface-800 text-surface-700",
  selected: "bg-accent text-foreground",
  available: "bg-surface-700 text-foreground hover:bg-surface-500",
};

function resolveSeatState(seat: SeatAvailability, isSelected: boolean): SeatVisualState {
  if (!seat.isAvailable) {
    return "taken";
  }
  if (isSelected) {
    return "selected";
  }
  return "available";
}

function seatLabel(seat: SeatAvailability): string {
  return `${seat.rowLabel}${seat.seatNumber}`;
}

function sortByRowThenNumber(a: SeatAvailability, b: SeatAvailability): number {
  if (a.rowLabel !== b.rowLabel) {
    return a.rowLabel.localeCompare(b.rowLabel);
  }
  return a.seatNumber - b.seatNumber;
}

export function SeatPicker({
  seatMap,
  selected,
  onChange,
}: {
  seatMap: SeatAvailabilityMap;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const rows = new Map<string, SeatAvailability[]>();
  [...seatMap.seats].sort(sortByRowThenNumber).forEach((seat) => {
    const bucket = rows.get(seat.rowLabel) ?? [];
    bucket.push(seat);
    rows.set(seat.rowLabel, bucket);
  });

  return (
    <div className="flex flex-col gap-2 overflow-x-auto pb-2">
      {Array.from(rows.entries()).map(([rowLabel, seats]) => (
        <div key={rowLabel} className="flex items-center gap-2">
          <span className="font-ticket w-5 text-xs text-surface-500">{rowLabel}</span>
          <div className="flex gap-2">
            {seats.map((seat) => {
              const isSelected = selected.has(seat.id);
              const state = resolveSeatState(seat, isSelected);
              return (
                <button
                  key={seat.id}
                  type="button"
                  disabled={!seat.isAvailable}
                  onClick={() => onChange(toggleSeatSelection(selected, seat))}
                  aria-label={`Seat ${seatLabel(seat)}${SEAT_STATE_LABEL[state]}`}
                  aria-pressed={isSelected}
                  className={`focus-ring font-ticket flex h-8 w-8 items-center justify-center rounded text-xs transition-colors ${SEAT_STATE_CLASSNAME[state]}`}
                >
                  {seat.seatNumber}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-2 flex gap-4 text-xs text-surface-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-surface-700" /> Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-accent" /> Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-surface-800" /> Taken
        </span>
      </div>
    </div>
  );
}
