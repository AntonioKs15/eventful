"use client";

import { PAGINATION_DEFAULTS } from "@eventful/contracts";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { listActors } from "@/lib/actors/actors-api";

export default function ActorsPage() {
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.PAGE);

  const { data, isPending, error } = useQuery({
    queryKey: ["actors", { page }],
    queryFn: () => listActors({ page, pageSize: PAGINATION_DEFAULTS.PAGE_SIZE }),
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-16">
      <h1 className="font-display text-4xl font-bold text-foreground">Actors &amp; actresses</h1>

      <ApiErrorNotice error={error} />

      <ActorsResults isPending={isPending} data={data} onPageChange={setPage} />
    </div>
  );
}

function ActorsResults({
  isPending,
  data,
  onPageChange,
}: {
  isPending: boolean;
  data: Awaited<ReturnType<typeof listActors>> | undefined;
  onPageChange: (page: number) => void;
}) {
  if (isPending) {
    return <p className="text-surface-500">Loading actors…</p>;
  }

  if (!data || data.data.length === 0) {
    return <EmptyState title="No actors found" description="Check back soon." />;
  }

  return (
    <>
      <section className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {data.data.map((actor) => (
          <Link
            key={actor.id}
            href={`/actors/${actor.id}`}
            className="focus-ring group flex flex-col items-center gap-3 rounded-2xl p-3 text-center"
          >
            <div className="relative h-28 w-28 overflow-hidden rounded-full bg-surface-700">
              {actor.photoUrl ? (
                <Image
                  src={actor.photoUrl}
                  alt={actor.name}
                  fill
                  sizes="112px"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : null}
            </div>
            <span className="text-sm font-medium text-foreground">{actor.name}</span>
          </Link>
        ))}
      </section>
      <Pagination meta={data.meta} onPageChange={onPageChange} />
    </>
  );
}
