"use client";

import { PAGINATION_DEFAULTS, UserRole } from "@eventful/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDayNumber, formatEventTime, formatWeekdayShort, toDateKey } from "@/lib/format";
import { getMovie, getMovieReviews, getMovieShowtimes } from "@/lib/movies/movies-api";
import { createReview } from "@/lib/reviews/reviews-api";

type TabKey = "overview" | "showtimes" | "reviews";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "showtimes", label: "Showtime" },
  { key: "reviews", label: "Reviews" },
];

export default function MovieDetailPage() {
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState<TabKey>("overview");

  const { data: movie, isPending, error } = useQuery({
    queryKey: ["movies", params.id],
    queryFn: () => getMovie(params.id),
  });

  if (isPending) {
    return <p className="mx-auto max-w-4xl px-6 py-16 text-surface-500">Loading movie…</p>;
  }

  if (error || !movie) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-16">
        <ApiErrorNotice error={error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="relative h-72 w-full overflow-hidden sm:h-96">
        <Image
          src={movie.backdropImageUrl ?? movie.posterImageUrl}
          alt={movie.title}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-950 via-surface-950/60 to-transparent" />
      </div>

      <div className="mx-auto -mt-24 flex w-full max-w-5xl flex-col gap-6 px-6 pb-16 sm:flex-row">
        <div className="relative -mt-4 h-64 w-44 shrink-0 overflow-hidden rounded-2xl shadow-xl shadow-black/40 sm:h-72 sm:w-48">
          <Image src={movie.posterImageUrl} alt={movie.title} fill sizes="192px" className="object-cover" />
        </div>

        <div className="flex flex-1 flex-col gap-4 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {movie.genres.map((genre) => (
              <span key={genre} className="rounded-full border border-surface-700 px-3 py-1 text-xs text-surface-400">
                {genre}
              </span>
            ))}
            <span className="rounded-full border border-surface-700 px-3 py-1 text-xs text-surface-400">
              {movie.ratingLabel}
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold text-foreground">{movie.title}</h1>
          <div className="flex items-center gap-4 text-sm text-surface-400">
            <span>{movie.durationMinutes} min</span>
            {movie.averageRating != null ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-accent text-accent" />
                {movie.averageRating.toFixed(1)} ({movie.reviewCount})
              </span>
            ) : null}
          </div>

          <div className="mt-2 flex gap-2 border-b border-surface-700">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`focus-ring border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  tab === item.key
                    ? "border-accent text-foreground"
                    : "border-transparent text-surface-400 hover:text-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "overview" ? <OverviewTab synopsis={movie.synopsis} cast={movie.cast} /> : null}
          {tab === "showtimes" ? <ShowtimeTab movieId={movie.id} /> : null}
          {tab === "reviews" ? <ReviewsTab movieId={movie.id} /> : null}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  synopsis,
  cast,
}: {
  synopsis: string;
  cast: { id: string; characterName: string; actor: { id: string; name: string; photoUrl: string | null } }[];
}) {
  return (
    <div className="flex flex-col gap-6 py-4">
      <p className="max-w-2xl text-foreground/90">{synopsis}</p>

      {cast.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-surface-400">Cast</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {cast.map((member) => (
              <Link
                key={member.id}
                href={`/actors/${member.actor.id}`}
                className="focus-ring flex w-20 shrink-0 flex-col items-center gap-2 text-center"
              >
                <div className="relative h-16 w-16 overflow-hidden rounded-full bg-surface-700">
                  {member.actor.photoUrl ? (
                    <Image src={member.actor.photoUrl} alt={member.actor.name} fill sizes="64px" className="object-cover" />
                  ) : null}
                </div>
                <span className="text-xs text-foreground">{member.actor.name}</span>
                <span className="text-[10px] text-surface-500">{member.characterName}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ShowtimeTab({ movieId }: { movieId: string }) {
  const { data, isPending, error } = useQuery({
    queryKey: ["movies", movieId, "showtimes"],
    queryFn: () => getMovieShowtimes(movieId, { page: 1, pageSize: 50 }),
  });

  const dateGroups = useMemo(() => {
    if (!data) {
      return [];
    }
    const byDate = new Map<string, typeof data.data>();
    for (const showtime of data.data) {
      const key = toDateKey(showtime.startsAt);
      const existing = byDate.get(key) ?? [];
      existing.push(showtime);
      byDate.set(key, existing);
    }
    return Array.from(byDate.entries());
  }, [data]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const activeDate = selectedDate ?? dateGroups[0]?.[0] ?? null;
  const activeShowtimes = dateGroups.find(([key]) => key === activeDate)?.[1] ?? [];

  if (isPending) {
    return <p className="py-4 text-surface-500">Loading showtimes…</p>;
  }

  if (error) {
    return (
      <div className="py-4">
        <ApiErrorNotice error={error} />
      </div>
    );
  }

  if (dateGroups.length === 0) {
    return (
      <div className="py-4">
        <EmptyState title="No showtimes yet" description="Check back soon for upcoming sessions." />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {dateGroups.map(([key, showtimes]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSelectedDate(key)}
            className={`focus-ring flex w-14 shrink-0 flex-col items-center rounded-xl py-2 text-sm transition-colors ${
              key === activeDate ? "gradient-cta text-white" : "border border-surface-700 text-surface-400 hover:text-foreground"
            }`}
          >
            <span className="text-xs uppercase">{formatWeekdayShort(showtimes[0].startsAt)}</span>
            <span className="font-display text-lg font-bold">{formatDayNumber(showtimes[0].startsAt)}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {Object.entries(
          activeShowtimes.reduce<Record<string, typeof activeShowtimes>>((groups, showtime) => {
            const venueKey = `${showtime.venue.name} · ${showtime.venue.city}`;
            groups[venueKey] = [...(groups[venueKey] ?? []), showtime];
            return groups;
          }, {}),
        ).map(([venueLabel, showtimes]) => (
          <div key={venueLabel}>
            <p className="text-sm font-medium text-foreground">{venueLabel}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {showtimes.map((showtime) => (
                <Link
                  key={showtime.id}
                  href={`/events/${showtime.id}`}
                  className="focus-ring rounded-lg border border-surface-700 px-3 py-1.5 text-sm text-foreground hover:border-accent hover:text-accent"
                >
                  {formatEventTime(showtime.startsAt)}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReviewsTab({ movieId }: { movieId: string }) {
  const { user } = useAuth();

  const { data, isPending, error } = useQuery({
    queryKey: ["movies", movieId, "reviews"],
    queryFn: () => getMovieReviews(movieId, { page: 1, pageSize: PAGINATION_DEFAULTS.PAGE_SIZE }),
  });

  return (
    <div className="flex flex-col gap-6 py-4">
      {user?.role === UserRole.CUSTOMER ? <WriteReviewSection movieId={movieId} /> : null}
      <ReviewsList isPending={isPending} error={error} data={data} />
    </div>
  );
}

function WriteReviewSection({ movieId }: { movieId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const submitReview = useMutation({
    mutationFn: () => createReview({ movieId, rating, comment }),
    onSuccess: () => {
      setShowForm(false);
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["movies", movieId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["movies", movieId] });
    },
  });

  if (!showForm) {
    return (
      <Button onClick={() => setShowForm(true)} className="self-start">
        Write a review
      </Button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submitReview.mutate();
      }}
      className="flex flex-col gap-3 rounded-2xl border border-surface-700 p-4"
    >
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className="focus-ring"
            aria-label={`${value} stars`}
          >
            <Star className={`h-6 w-6 ${value <= rating ? "fill-accent text-accent" : "text-surface-700"}`} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Type something here"
        rows={3}
        required
        className="focus-ring rounded-lg border border-surface-700 bg-surface-900 px-3.5 py-2.5 text-foreground placeholder:text-surface-500"
      />
      {submitReview.error ? <ApiErrorNotice error={submitReview.error} /> : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={submitReview.isPending}>
          Send
        </Button>
        <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ReviewsList({
  isPending,
  error,
  data,
}: {
  isPending: boolean;
  error: unknown;
  data: Awaited<ReturnType<typeof getMovieReviews>> | undefined;
}) {
  if (isPending) {
    return <p className="text-surface-500">Loading reviews…</p>;
  }

  if (error) {
    return <ApiErrorNotice error={error} />;
  }

  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        title="No reviews yet"
        description="Be the first to review — customers who hold a ticket can leave one."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.data.map((review) => (
        <div key={review.id} className="rounded-2xl border border-surface-700 p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">{review.user.name}</span>
            <span className="inline-flex items-center gap-1 text-sm text-accent">
              <Star className="h-4 w-4 fill-accent text-accent" />
              {review.rating}
            </span>
          </div>
          <p className="mt-2 text-sm text-surface-400">{review.comment}</p>
        </div>
      ))}
    </div>
  );
}
