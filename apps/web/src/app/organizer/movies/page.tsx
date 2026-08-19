"use client";

import { MovieStatus, PAGINATION_DEFAULTS, UserRole } from "@eventful/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { TextField } from "@/components/ui/text-field";
import { AuthGuard } from "@/lib/auth/auth-guard";
import { CatalogMovieSummary, searchMovieCatalog } from "@/lib/catalog/catalog-api";
import { CreateMovieInput, createMovie, listMovies } from "@/lib/movies/movies-api";

interface FormValues {
  title: string;
  synopsis: string;
  durationMinutes: number;
  genres: string;
  releaseDate: string;
  posterImageUrl: string;
  ratingLabel: string;
}

type SourceMode = "manual" | "tmdb";

function CreateMovieForm() {
  const queryClient = useQueryClient();
  const [sourceMode, setSourceMode] = useState<SourceMode>("manual");
  const [selectedTmdbMovie, setSelectedTmdbMovie] = useState<CatalogMovieSummary | null>(null);
  const { register, handleSubmit, reset, setValue, formState: { isSubmitting } } = useForm<FormValues>({
    defaultValues: { durationMinutes: 120 },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateMovieInput) => createMovie(input),
    onSuccess: () => {
      reset();
      setSelectedTmdbMovie(null);
      queryClient.invalidateQueries({ queryKey: ["organizer-movies"] });
    },
  });

  function applyTmdbMovie(movie: CatalogMovieSummary) {
    setSelectedTmdbMovie(movie);
    setValue("title", movie.title);
    setValue("synopsis", movie.synopsis);
    setValue("genres", movie.genres.join(", "));
    setValue("posterImageUrl", movie.posterImageUrl ?? "");
    if (movie.releaseDate) {
      setValue("releaseDate", movie.releaseDate);
    }
  }

  function onSubmit(values: FormValues) {
    createMutation.mutate({
      title: values.title,
      synopsis: values.synopsis,
      durationMinutes: Number(values.durationMinutes),
      genres: values.genres.split(",").map((genre) => genre.trim()).filter(Boolean),
      releaseDate: new Date(values.releaseDate).toISOString(),
      posterImageUrl: values.posterImageUrl,
      backdropImageUrl: selectedTmdbMovie?.backdropImageUrl ?? undefined,
      ratingLabel: values.ratingLabel,
      status: MovieStatus.NOW_PLAYING,
      catalogSourceId: selectedTmdbMovie?.externalId,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 rounded-2xl border border-surface-700 p-6">
      <div className="flex gap-2">
        <Button type="button" variant={sourceMode === "manual" ? "primary" : "secondary"} onClick={() => setSourceMode("manual")}>
          Manual
        </Button>
        <Button type="button" variant={sourceMode === "tmdb" ? "primary" : "secondary"} onClick={() => setSourceMode("tmdb")}>
          From TMDb
        </Button>
      </div>

      {sourceMode === "tmdb" ? (
        <TmdbSearchPanel onSelect={applyTmdbMovie} selectedTitle={selectedTmdbMovie?.title} />
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField id="title" label="Title" {...register("title", { required: true })} />
        <TextField id="ratingLabel" label="Rating label" placeholder="L, 14, 18…" {...register("ratingLabel", { required: true })} />
        <TextField id="durationMinutes" label="Duration (minutes)" type="number" min={1} {...register("durationMinutes", { required: true })} />
        <TextField id="releaseDate" label="Release date" type="date" {...register("releaseDate", { required: true })} />
        <TextField id="genres" label="Genres (comma separated)" {...register("genres", { required: true })} />
        <TextField id="posterImageUrl" label="Poster image URL" {...register("posterImageUrl", { required: true })} />
      </div>
      <label className="flex flex-col gap-1.5 text-sm" htmlFor="synopsis">
        <span className="font-medium text-surface-400">Synopsis</span>
        <textarea
          id="synopsis"
          rows={3}
          className="focus-ring rounded-lg border border-surface-700 bg-surface-900 px-3.5 py-2.5 text-foreground"
          {...register("synopsis", { required: true })}
        />
      </label>
      <ApiErrorNotice error={createMutation.error} />
      <Button type="submit" disabled={isSubmitting || createMutation.isPending} className="self-start">
        {createMutation.isPending ? "Creating…" : "Create movie"}
      </Button>
    </form>
  );
}

function TmdbSearchPanel({
  onSelect,
  selectedTitle,
}: {
  onSelect: (movie: CatalogMovieSummary) => void;
  selectedTitle: string | undefined;
}) {
  const [keyword, setKeyword] = useState("");
  const [committed, setCommitted] = useState<string | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["tmdb-search", committed],
    queryFn: () => searchMovieCatalog(committed ?? ""),
    enabled: committed !== null,
  });

  return (
    <div className="rounded-xl border border-surface-700 p-5">
      <div className="flex flex-wrap items-end gap-3">
        <TextField id="tmdb-keyword" label="Movie title" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <Button type="button" variant="secondary" onClick={() => setCommitted(keyword)}>
          Search TMDb
        </Button>
      </div>

      {selectedTitle ? <p className="mt-3 font-ticket text-xs text-accent">Selected: {selectedTitle}</p> : null}

      <ApiErrorNotice error={error} />

      {isPending && committed !== null ? <p className="mt-3 text-sm text-surface-500">Searching…</p> : null}

      {data ? (
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {data.data.map((movie) => (
            <button
              key={movie.externalId}
              type="button"
              onClick={() => onSelect(movie)}
              className="focus-ring flex flex-col gap-1 rounded-lg text-left"
            >
              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-surface-800">
                {movie.posterImageUrl ? (
                  <Image src={movie.posterImageUrl} alt={movie.title} fill sizes="120px" className="object-cover" />
                ) : null}
              </div>
              <span className="text-xs text-foreground">{movie.title}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OrganizerMoviesList() {
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.PAGE);

  const { data, isPending, error } = useQuery({
    queryKey: ["organizer-movies", { page }],
    queryFn: () => listMovies({ page, pageSize: PAGINATION_DEFAULTS.PAGE_SIZE }),
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
      <div>
        <p className="font-ticket text-xs uppercase tracking-[0.2em] text-accent">Box office</p>
        <h1 className="font-display text-4xl font-bold text-foreground">My movies</h1>
      </div>

      <CreateMovieForm />

      <ApiErrorNotice error={error} />

      <OrganizerMoviesResults isPending={isPending} data={data} onPageChange={setPage} />
    </div>
  );
}

function OrganizerMoviesResults({
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
    return <EmptyState title="No movies yet" description="Create your first movie above." />;
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {data.data.map((movie) => (
          <div key={movie.id} className="flex items-center gap-4 rounded-xl border border-surface-700 px-5 py-4">
            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-800">
              <Image src={movie.posterImageUrl} alt={movie.title} fill sizes="48px" className="object-cover" />
            </div>
            <div className="flex-1">
              <p className="font-display text-lg font-bold text-foreground">{movie.title}</p>
              <p className="text-sm text-surface-400">{movie.status}</p>
            </div>
            <Link
              href={`/organizer/movies/${movie.id}/edit`}
              className="focus-ring rounded-full border border-surface-700 px-4 py-1.5 text-xs font-medium text-foreground hover:border-accent hover:text-accent"
            >
              Edit
            </Link>
            <Link
              href={`/organizer/movies/${movie.id}/cast`}
              className="focus-ring rounded-full border border-surface-700 px-4 py-1.5 text-xs font-medium text-foreground hover:border-accent hover:text-accent"
            >
              Manage cast
            </Link>
          </div>
        ))}
      </div>
      <Pagination meta={data.meta} onPageChange={onPageChange} />
    </>
  );
}

export default function OrganizerMoviesPage() {
  return (
    <AuthGuard allow={[UserRole.ORGANIZER]}>
      <OrganizerMoviesList />
    </AuthGuard>
  );
}
