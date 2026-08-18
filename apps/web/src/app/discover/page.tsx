"use client";

import { PAGINATION_DEFAULTS } from "@eventful/contracts";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { MovieCard } from "@/components/movie-card";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { listMovies } from "@/lib/movies/movies-api";

export default function DiscoverPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.PAGE);

  const { data, isPending, error } = useQuery({
    queryKey: ["movies", "discover", { search, page }],
    queryFn: () =>
      listMovies({
        search: search || undefined,
        page,
        pageSize: PAGINATION_DEFAULTS.PAGE_SIZE,
      }),
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16">
      <h1 className="font-display text-4xl font-bold text-foreground">Discover</h1>

      <label className="relative block max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-500" />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(PAGINATION_DEFAULTS.PAGE);
          }}
          placeholder="Search movies…"
          className="focus-ring w-full rounded-lg border border-surface-700 bg-surface-900 py-2.5 pl-10 pr-3.5 text-foreground placeholder:text-surface-500"
        />
      </label>

      <ApiErrorNotice error={error} />

      <DiscoverResults isPending={isPending} data={data} onPageChange={setPage} />
    </div>
  );
}

function DiscoverResults({
  isPending,
  data,
  onPageChange,
}: {
  isPending: boolean;
  data: Awaited<ReturnType<typeof listMovies>> | undefined;
  onPageChange: (page: number) => void;
}) {
  if (isPending) {
    return <p className="text-surface-500">Searching…</p>;
  }

  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        title="No result found"
        description="Try a different title or check back once more movies are added."
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
