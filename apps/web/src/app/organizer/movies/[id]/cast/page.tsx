"use client";

import { UserRole } from "@eventful/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TextField } from "@/components/ui/text-field";
import { AuthGuard } from "@/lib/auth/auth-guard";
import { listActors } from "@/lib/actors/actors-api";
import { attachCast, detachCast, getMovie } from "@/lib/movies/movies-api";

function ManageCastContent() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [characterName, setCharacterName] = useState("");
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);

  const movieQuery = useQuery({
    queryKey: ["movies", params.id],
    queryFn: () => getMovie(params.id),
  });

  const actorsQuery = useQuery({
    queryKey: ["actors", "search", search],
    queryFn: () => listActors({ search: search || undefined, page: 1, pageSize: 10 }),
    enabled: search.length > 0,
  });

  const attachMutation = useMutation({
    mutationFn: () =>
      attachCast(params.id, { actorId: selectedActorId as string, characterName }),
    onSuccess: () => {
      setCharacterName("");
      setSelectedActorId(null);
      setSearch("");
      queryClient.invalidateQueries({ queryKey: ["movies", params.id] });
    },
  });

  const detachMutation = useMutation({
    mutationFn: (actorId: string) => detachCast(params.id, actorId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["movies", params.id] }),
  });

  if (movieQuery.isPending) {
    return <p className="mx-auto max-w-2xl px-6 py-16 text-surface-500">Loading movie…</p>;
  }

  if (!movieQuery.data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <ApiErrorNotice error={movieQuery.error} />
      </div>
    );
  }

  const movie = movieQuery.data;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
      <div>
        <p className="font-ticket text-xs uppercase tracking-[0.2em] text-accent">Manage cast</p>
        <h1 className="font-display text-4xl font-bold text-foreground">{movie.title}</h1>
      </div>

      <div className="flex flex-col gap-3">
        {movie.cast.length === 0 ? (
          <EmptyState title="No cast yet" description="Search for an actor below to add them." />
        ) : (
          movie.cast.map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-xl border border-surface-700 px-5 py-3">
              <div>
                <p className="font-medium text-foreground">{member.actor.name}</p>
                <p className="text-xs text-surface-400">{member.characterName}</p>
              </div>
              <button
                type="button"
                onClick={() => detachMutation.mutate(member.actor.id)}
                className="focus-ring text-xs text-negative hover:underline"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-surface-700 p-6">
        <TextField
          id="actor-search"
          label="Search actor by name"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setSelectedActorId(null);
          }}
        />

        {actorsQuery.data ? (
          <div className="flex flex-col gap-2">
            {actorsQuery.data.data.map((actor) => (
              <button
                key={actor.id}
                type="button"
                onClick={() => setSelectedActorId(actor.id)}
                className={`focus-ring rounded-lg border px-4 py-2.5 text-left text-sm ${
                  selectedActorId === actor.id ? "border-accent text-accent" : "border-surface-700 text-foreground"
                }`}
              >
                {actor.name}
              </button>
            ))}
          </div>
        ) : null}

        <TextField
          id="characterName"
          label="Character name"
          value={characterName}
          onChange={(event) => setCharacterName(event.target.value)}
        />

        <ApiErrorNotice error={attachMutation.error} />

        <Button
          type="button"
          disabled={!selectedActorId || !characterName || attachMutation.isPending}
          onClick={() => attachMutation.mutate()}
          className="self-start"
        >
          {attachMutation.isPending ? "Adding…" : "Add to cast"}
        </Button>
      </div>
    </div>
  );
}

export default function ManageCastPage() {
  return (
    <AuthGuard allow={[UserRole.ORGANIZER]}>
      <ManageCastContent />
    </AuthGuard>
  );
}
