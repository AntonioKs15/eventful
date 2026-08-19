"use client";

import { UserRole } from "@eventful/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { AuthGuard } from "@/lib/auth/auth-guard";
import { getMovie, updateMovie } from "@/lib/movies/movies-api";

interface FormValues {
  title: string;
  synopsis: string;
  durationMinutes: number;
  genres: string;
  releaseDate: string;
  posterImageUrl: string;
  ratingLabel: string;
}

function toDateInputValue(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function EditMovieForm() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const movieQuery = useQuery({
    queryKey: ["movies", params.id],
    queryFn: () => getMovie(params.id),
  });

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FormValues>();

  useEffect(() => {
    if (!movieQuery.data) {
      return;
    }
    reset({
      title: movieQuery.data.title,
      synopsis: movieQuery.data.synopsis,
      durationMinutes: movieQuery.data.durationMinutes,
      genres: movieQuery.data.genres.join(", "),
      releaseDate: toDateInputValue(movieQuery.data.releaseDate),
      posterImageUrl: movieQuery.data.posterImageUrl,
      ratingLabel: movieQuery.data.ratingLabel,
    });
  }, [movieQuery.data, reset]);

  const updateMutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateMovie(params.id, {
        title: values.title,
        synopsis: values.synopsis,
        durationMinutes: Number(values.durationMinutes),
        genres: values.genres.split(",").map((genre) => genre.trim()).filter(Boolean),
        releaseDate: new Date(values.releaseDate).toISOString(),
        posterImageUrl: values.posterImageUrl,
        ratingLabel: values.ratingLabel,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizer-movies"] });
      queryClient.invalidateQueries({ queryKey: ["movies", params.id] });
      router.push("/organizer/movies");
    },
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

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
      <div>
        <p className="font-ticket text-xs uppercase tracking-[0.2em] text-accent">Box office</p>
        <h1 className="font-display text-4xl font-bold text-foreground">Edit movie</h1>
      </div>

      <form
        onSubmit={handleSubmit((values) => updateMutation.mutate(values))}
        className="flex flex-col gap-5 rounded-2xl border border-surface-700 p-6"
      >
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField id="title" label="Title" {...register("title", { required: true })} />
          <TextField id="ratingLabel" label="Rating label" {...register("ratingLabel", { required: true })} />
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
        <ApiErrorNotice error={updateMutation.error} />
        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting || updateMutation.isPending}>
            {updateMutation.isPending ? "Saving…" : "Save changes"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/organizer/movies")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function EditMoviePage() {
  return (
    <AuthGuard allow={[UserRole.ORGANIZER]}>
      <EditMovieForm />
    </AuthGuard>
  );
}
