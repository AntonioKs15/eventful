"use client";

import { EventLayoutType, UserRole } from "@eventful/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { TextField } from "@/components/ui/text-field";
import { AuthGuard } from "@/lib/auth/auth-guard";
import { CatalogEventSummary, searchCatalog } from "@/lib/catalog/catalog-api";
import { CreateEventVenueInput, createEvent } from "@/lib/events/events-api";
import { formatPriceCents } from "@/lib/format";
import { listMovies } from "@/lib/movies/movies-api";
import { MovieSummary } from "@/lib/movies/types";

type VenueMode = "manual" | "catalog";

interface FormValues {
  title: string;
  description: string;
  startsAtDate: string;
  startsAtTime: string;
  capacity: number;
  price: number;
  rows: number;
  columns: number;
  venueName: string;
  venueCity: string;
  venueAddress: string;
}

function CreateEventForm() {
  const router = useRouter();
  const [layoutType, setLayoutType] = useState<EventLayoutType>(EventLayoutType.GENERAL_ADMISSION);
  const [venueMode, setVenueMode] = useState<VenueMode>("manual");
  const [selectedCatalogEvent, setSelectedCatalogEvent] = useState<CatalogEventSummary | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<MovieSummary | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { capacity: 1, price: 0, rows: 5, columns: 8 },
  });

  const rows = watch("rows");
  const columns = watch("columns");

  useEffect(() => {
    if (layoutType === EventLayoutType.SEATED) {
      setValue("capacity", (Number(rows) || 0) * (Number(columns) || 0));
    }
  }, [rows, columns, layoutType, setValue]);

  const createMutation = useMutation({
    mutationFn: createEvent,
    onSuccess: () => router.push("/organizer/events"),
  });

  function applyCatalogEvent(catalogEvent: CatalogEventSummary) {
    setSelectedCatalogEvent(catalogEvent);
    setValue("title", catalogEvent.title);
    setValue("venueName", catalogEvent.venueName ?? "");
    setValue("venueCity", catalogEvent.venueCity ?? "");
    if (catalogEvent.startDate) {
      setValue("startsAtDate", catalogEvent.startDate);
    }
    if (catalogEvent.startTime) {
      setValue("startsAtTime", catalogEvent.startTime.slice(0, 5));
    }
    if (catalogEvent.minPriceCents) {
      setValue("price", catalogEvent.minPriceCents / 100);
    }
  }

  function onSubmit(values: FormValues) {
    const startsAt = new Date(`${values.startsAtDate}T${values.startsAtTime}`).toISOString();
    const venue: CreateEventVenueInput = {
      name: values.venueName,
      city: values.venueCity,
      address: values.venueAddress,
      externalId:
        venueMode === "catalog" ? (selectedCatalogEvent?.venueExternalId ?? undefined) : undefined,
    };

    createMutation.mutate({
      title: values.title,
      description: values.description,
      startsAt,
      capacity: Number(values.capacity),
      priceCents: Math.round(Number(values.price) * 100),
      layoutType,
      venue,
      seatMap:
        layoutType === EventLayoutType.SEATED
          ? { rows: Number(values.rows), columns: Number(values.columns) }
          : undefined,
      catalogSourceId: selectedCatalogEvent?.externalId,
      movieId: selectedMovie?.id,
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
      <MoviePicker
        selectedMovie={selectedMovie}
        onSelect={(movie) => {
          setSelectedMovie(movie);
          setValue("title", movie.title);
        }}
      />

      <VenueModeTabs mode={venueMode} onChange={setVenueMode} />

      {venueMode === "catalog" ? (
        <CatalogSearchPanel onSelect={applyCatalogEvent} selectedTitle={selectedCatalogEvent?.title} />
      ) : null}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField
          id="title"
          label="Title"
          readOnly={Boolean(selectedMovie)}
          {...register("title", { required: true })}
        />
        <div />
        <div className="sm:col-span-2">
          <label className="flex flex-col gap-1.5 text-sm" htmlFor="description">
            <span className="font-medium text-surface-400">Description</span>
            <textarea
              id="description"
              rows={3}
              className="focus-ring rounded-lg border border-surface-700 bg-surface-900 px-3.5 py-2.5 text-foreground"
              {...register("description", { required: true })}
            />
          </label>
        </div>
        <TextField id="startsAtDate" label="Date" type="date" {...register("startsAtDate", { required: true })} />
        <TextField id="startsAtTime" label="Time" type="time" {...register("startsAtTime", { required: true })} />
        <TextField id="venueName" label="Venue name" {...register("venueName", { required: true })} />
        <TextField id="venueCity" label="City" {...register("venueCity", { required: true })} />
        <div className="sm:col-span-2">
          <TextField id="venueAddress" label="Address" {...register("venueAddress", { required: true })} />
        </div>
        <TextField id="price" label="Price (USD)" type="number" step="0.01" min={0} {...register("price", { required: true })} />
      </div>

      <LayoutTypeFields
        layoutType={layoutType}
        onChangeLayoutType={setLayoutType}
        register={register}
        capacity={watch("capacity")}
      />

      <ApiErrorNotice error={createMutation.error} />

      <Button type="submit" disabled={isSubmitting || createMutation.isPending} className="self-start">
        {createMutation.isPending ? "Creating…" : "Create event"}
      </Button>
    </form>
  );
}

function MoviePicker({
  selectedMovie,
  onSelect,
}: {
  selectedMovie: MovieSummary | null;
  onSelect: (movie: MovieSummary) => void;
}) {
  const [search, setSearch] = useState("");

  const { data, isPending, error } = useQuery({
    queryKey: ["movies", "picker", search],
    queryFn: () => listMovies({ search, page: 1, pageSize: 10 }),
    enabled: search.length > 0,
  });

  return (
    <div className="rounded-xl border border-surface-700 p-5">
      <TextField
        id="movie-search"
        label="Movie"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search a movie by title…"
      />

      {selectedMovie ? (
        <p className="mt-3 font-ticket text-xs text-accent">Selected: {selectedMovie.title}</p>
      ) : null}

      <ApiErrorNotice error={error} />

      {isPending && search ? <p className="mt-3 text-sm text-surface-500">Searching…</p> : null}

      {data ? (
        <div className="mt-4 flex flex-col gap-2">
          {data.data.map((movie) => (
            <button
              key={movie.id}
              type="button"
              onClick={() => onSelect(movie)}
              className="focus-ring flex items-center justify-between rounded-lg border border-surface-700 px-4 py-3 text-left transition-colors hover:border-accent"
            >
              <span className="block font-medium text-foreground">{movie.title}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function VenueModeTabs({ mode, onChange }: { mode: VenueMode; onChange: (mode: VenueMode) => void }) {
  return (
    <div className="flex gap-2">
      <Button type="button" variant={mode === "manual" ? "primary" : "secondary"} onClick={() => onChange("manual")}>
        Manual
      </Button>
      <Button type="button" variant={mode === "catalog" ? "primary" : "secondary"} onClick={() => onChange("catalog")}>
        From Ticketmaster
      </Button>
    </div>
  );
}

function CatalogSearchPanel({
  onSelect,
  selectedTitle,
}: {
  onSelect: (event: CatalogEventSummary) => void;
  selectedTitle: string | undefined;
}) {
  const [keyword, setKeyword] = useState("");
  const [city, setCity] = useState("");
  const [committed, setCommitted] = useState<{ keyword: string; city: string } | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: ["catalog-search", committed],
    queryFn: () => searchCatalog(committed?.keyword ?? "", committed?.city ?? ""),
    enabled: committed !== null,
  });

  return (
    <div className="rounded-xl border border-surface-700 p-5">
      <div className="flex flex-wrap items-end gap-3">
        <TextField id="keyword" label="Keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <TextField id="catalog-city" label="City" value={city} onChange={(e) => setCity(e.target.value)} />
        <Button type="button" variant="secondary" onClick={() => setCommitted({ keyword, city })}>
          Search
        </Button>
      </div>

      {selectedTitle ? (
        <p className="mt-3 font-ticket text-xs text-accent">Selected: {selectedTitle}</p>
      ) : null}

      <ApiErrorNotice error={error} />

      {isPending && committed ? <p className="mt-3 text-sm text-surface-500">Searching…</p> : null}

      {data ? (
        <div className="mt-4 flex flex-col gap-2">
          {data.data.map((catalogEvent) => (
            <button
              key={catalogEvent.externalId}
              type="button"
              onClick={() => onSelect(catalogEvent)}
              className="focus-ring flex items-center justify-between rounded-lg border border-surface-700 px-4 py-3 text-left transition-colors hover:border-accent"
            >
              <span>
                <span className="block font-medium text-foreground">{catalogEvent.title}</span>
                <span className="block text-xs text-surface-500">
                  {catalogEvent.venueName ?? "Venue TBD"} · {catalogEvent.venueCity ?? "—"}
                </span>
              </span>
              {catalogEvent.minPriceCents ? (
                <span className="font-ticket text-sm text-accent">
                  {formatPriceCents(catalogEvent.minPriceCents)}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function LayoutTypeFields({
  layoutType,
  onChangeLayoutType,
  register,
  capacity,
}: {
  layoutType: EventLayoutType;
  onChangeLayoutType: (layoutType: EventLayoutType) => void;
  register: ReturnType<typeof useForm<FormValues>>["register"];
  capacity: number;
}) {
  return (
    <div className="rounded-xl border border-surface-700 p-5">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={layoutType === EventLayoutType.GENERAL_ADMISSION ? "primary" : "secondary"}
          onClick={() => onChangeLayoutType(EventLayoutType.GENERAL_ADMISSION)}
        >
          General admission
        </Button>
        <Button
          type="button"
          variant={layoutType === EventLayoutType.SEATED ? "primary" : "secondary"}
          onClick={() => onChangeLayoutType(EventLayoutType.SEATED)}
        >
          Assigned seating
        </Button>
      </div>

      {layoutType === EventLayoutType.SEATED ? (
        <div className="mt-4 grid grid-cols-2 gap-5 sm:w-64">
          <TextField id="rows" label="Rows" type="number" min={1} {...register("rows", { required: true })} />
          <TextField id="columns" label="Seats per row" type="number" min={1} {...register("columns", { required: true })} />
          <p className="col-span-2 font-ticket text-xs text-surface-500">Capacity: {capacity}</p>
        </div>
      ) : (
        <div className="mt-4 sm:w-48">
          <TextField id="capacity" label="Capacity" type="number" min={1} {...register("capacity", { required: true })} />
        </div>
      )}
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <AuthGuard allow={[UserRole.ORGANIZER]}>
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-16">
        <div>
          <p className="font-ticket text-xs uppercase tracking-[0.2em] text-accent">Box office</p>
          <h1 className="font-display text-5xl font-bold uppercase leading-none text-foreground">
            Create event
          </h1>
        </div>
        <CreateEventForm />
      </div>
    </AuthGuard>
  );
}
