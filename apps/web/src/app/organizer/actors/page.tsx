"use client";

import { PAGINATION_DEFAULTS, UserRole } from "@eventful/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { TextField } from "@/components/ui/text-field";
import { AuthGuard } from "@/lib/auth/auth-guard";
import { CreateActorInput, createActor, listActors } from "@/lib/actors/actors-api";

interface FormValues {
  name: string;
  photoUrl: string;
  bio: string;
}

function CreateActorForm() {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>();

  const createMutation = useMutation({
    mutationFn: (input: CreateActorInput) => createActor(input),
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: ["organizer-actors"] });
    },
  });

  function onSubmit(values: FormValues) {
    createMutation.mutate({
      name: values.name,
      photoUrl: values.photoUrl || undefined,
      bio: values.bio || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 rounded-2xl border border-surface-700 p-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField id="name" label="Name" {...register("name", { required: true })} />
        <TextField id="photoUrl" label="Photo URL" {...register("photoUrl")} />
      </div>
      <label className="flex flex-col gap-1.5 text-sm" htmlFor="bio">
        <span className="font-medium text-surface-400">Bio</span>
        <textarea
          id="bio"
          rows={2}
          className="focus-ring rounded-lg border border-surface-700 bg-surface-900 px-3.5 py-2.5 text-foreground"
          {...register("bio")}
        />
      </label>
      <ApiErrorNotice error={createMutation.error} />
      <Button type="submit" disabled={isSubmitting || createMutation.isPending} className="self-start">
        {createMutation.isPending ? "Creating…" : "Create actor"}
      </Button>
    </form>
  );
}

function OrganizerActorsList() {
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.PAGE);

  const { data, isPending, error } = useQuery({
    queryKey: ["organizer-actors", { page }],
    queryFn: () => listActors({ page, pageSize: PAGINATION_DEFAULTS.PAGE_SIZE }),
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
      <div>
        <p className="font-ticket text-xs uppercase tracking-[0.2em] text-accent">Box office</p>
        <h1 className="font-display text-4xl font-bold text-foreground">My actors</h1>
      </div>

      <CreateActorForm />

      <ApiErrorNotice error={error} />

      <OrganizerActorsResults isPending={isPending} data={data} onPageChange={setPage} />
    </div>
  );
}

function OrganizerActorsResults({
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
    return <EmptyState title="No actors yet" description="Create your first actor above." />;
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {data.data.map((actor) => (
          <div key={actor.id} className="rounded-xl border border-surface-700 px-5 py-4">
            <p className="font-display text-lg font-bold text-foreground">{actor.name}</p>
            {actor.bio ? <p className="text-sm text-surface-400">{actor.bio}</p> : null}
          </div>
        ))}
      </div>
      <Pagination meta={data.meta} onPageChange={onPageChange} />
    </>
  );
}

export default function OrganizerActorsPage() {
  return (
    <AuthGuard allow={[UserRole.ORGANIZER]}>
      <OrganizerActorsList />
    </AuthGuard>
  );
}
