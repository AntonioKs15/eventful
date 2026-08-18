export type StatusTone = "neutral" | "positive" | "warning" | "negative";

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-surface-700 text-surface-400",
  positive: "bg-positive/20 text-positive",
  warning: "bg-accent/20 text-accent",
  negative: "bg-negative/20 text-negative",
};

export function StatusPill({ tone, label }: { tone: StatusTone; label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 font-ticket text-xs uppercase tracking-wide ${TONE_CLASSES[tone]}`}
    >
      {label}
    </span>
  );
}
