export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-ink-700 px-6 py-16 text-center">
      <p className="font-display text-xl font-bold uppercase text-paper">{title}</p>
      <p className="max-w-sm text-sm text-ink-400">{description}</p>
    </div>
  );
}
