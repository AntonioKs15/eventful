export type StatusTone = "neutral" | "positive" | "warning" | "negative";

const TONE_CLASSES: Record<StatusTone, string> = {
  neutral: "bg-ink-700 text-ink-400",
  positive: "bg-admit/20 text-admit",
  warning: "bg-marquee/20 text-marquee",
  negative: "bg-velvet/20 text-velvet",
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
