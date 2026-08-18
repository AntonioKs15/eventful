"use client";

import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { getActor } from "@/lib/actors/actors-api";
import { formatEventDate } from "@/lib/format";

export default function ActorDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: actor, isPending, error } = useQuery({
    queryKey: ["actors", params.id],
    queryFn: () => getActor(params.id),
  });

  if (isPending) {
    return <p className="mx-auto max-w-3xl px-6 py-16 text-surface-500">Loading actor…</p>;
  }

  if (error || !actor) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <ApiErrorNotice error={error} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-16">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <div className="relative h-36 w-36 shrink-0 overflow-hidden rounded-full bg-surface-700">
          {actor.photoUrl ? (
            <Image src={actor.photoUrl} alt={actor.name} fill sizes="144px" className="object-cover" />
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl font-bold text-foreground">{actor.name}</h1>
          {actor.bio ? <p className="max-w-xl text-surface-400">{actor.bio}</p> : null}
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-bold text-foreground">Filmography</h2>
        {actor.filmography.length === 0 ? (
          <EmptyState title="No movies yet" description="This actor has no linked movies yet." />
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {actor.filmography.map((entry) => (
              <Link
                key={entry.movie.id}
                href={`/movies/${entry.movie.id}`}
                className="focus-ring group block overflow-hidden rounded-2xl bg-surface-800"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-surface-700">
                  <Image
                    src={entry.movie.posterImageUrl}
                    alt={entry.movie.title}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium text-foreground">{entry.movie.title}</p>
                  <p className="text-xs text-surface-400">{entry.characterName}</p>
                  <p className="text-xs text-surface-500">{formatEventDate(entry.movie.releaseDate)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
