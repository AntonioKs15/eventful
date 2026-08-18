"use client";

import { MovieStatus, PAGINATION_DEFAULTS } from "@eventful/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MovieCard } from "@/components/movie-card";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { listMovies } from "@/lib/movies/movies-api";

const STATUS_TABS: { value: MovieStatus; label: string }[] = [
  { value: MovieStatus.NOW_PLAYING, label: "Now playing" },
  { value: MovieStatus.COMING_SOON, label: "Coming soon" },
];

export default function HomePage() {
  const [status, setStatus] = useState<MovieStatus>(MovieStatus.NOW_PLAYING);
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.PAGE);

  const { data, isPending, error } = useQuery({
    queryKey: ["movies", { status, page }],
    queryFn: () =>
      listMovies({ status, page, pageSize: PAGINATION_DEFAULTS.PAGE_SIZE }),
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16">
      <section className="flex flex-col gap-3">
        <p className="font-ticket text-xs uppercase tracking-[0.2em] text-accent">Now booking</p>
        <h1 className="font-display text-5xl font-bold leading-none text-foreground sm:text-6xl">
          Find your next movie night
        </h1>
        <p className="max-w-xl text-surface-400">
          Browse what&apos;s playing, pick a showtime and seats, and walk in with a QR ticket that
          only ever works once.
        </p>
      </section>

      <div className="flex gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => {
              setStatus(tab.value);
              setPage(PAGINATION_DEFAULTS.PAGE);
            }}
            className={`focus-ring rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              status === tab.value
                ? "gradient-cta text-white"
                : "border border-surface-700 text-surface-400 hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <ApiErrorNotice error={error} />

      <MoviesResults isPending={isPending} data={data} onPageChange={setPage} />
    </div>
  );
}

function MoviesResults({
  isPending,
  data,
  onPageChange,
}: {
  isPending: boolean;
  data: Awaited<ReturnType<typeof listMovies>> | undefined;
  onPageChange: (page: number) => void;
}) {
  if (isPending) {
    return <p className="text-surface-500">Loading movies…</p>;
  }

  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        title="No movies found"
        description="Check back soon — new movies are added all the time."
      />
    );
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {data.data.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </section>
      <Pagination meta={data.meta} onPageChange={onPageChange} />
    </>
  );
}
