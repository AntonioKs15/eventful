import { clampQuantity } from "@/lib/reservations/clamp-quantity";

export function QuantityPicker({
  quantity,
  remaining,
  onChange,
}: {
  quantity: number;
  remaining: number;
  onChange: (next: number) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => onChange(clampQuantity(quantity - 1, remaining))}
        disabled={quantity <= 1}
        className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-ink-700 text-paper disabled:opacity-30"
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="font-ticket w-6 text-center text-lg">{quantity}</span>
      <button
        type="button"
        onClick={() => onChange(clampQuantity(quantity + 1, remaining))}
        disabled={quantity >= remaining}
        className="focus-ring flex h-9 w-9 items-center justify-center rounded-full border border-ink-700 text-paper disabled:opacity-30"
        aria-label="Increase quantity"
      >
        +
      </button>
      <span className="text-xs text-ink-500">{remaining} left</span>
    </div>
  );
}
