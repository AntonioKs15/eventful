import Image from "next/image";
import Link from "next/link";
import { MovieSummary } from "@/lib/movies/types";

export function MovieCard({ movie }: { movie: MovieSummary }) {
  return (
    <Link
      href={`/movies/${movie.id}`}
      className="focus-ring group block overflow-hidden rounded-2xl bg-surface-800 transition-transform hover:-translate-y-1"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-surface-700">
        <Image
          src={movie.posterImageUrl}
          alt={movie.title}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span className="absolute right-2 top-2 rounded-full bg-surface-950/80 px-2 py-0.5 text-xs font-medium text-foreground backdrop-blur">
          {movie.ratingLabel}
        </span>
      </div>
      <div className="flex flex-col gap-1 p-4">
        <h3 className="font-display text-lg font-bold leading-tight text-foreground">
          {movie.title}
        </h3>
        <p className="text-xs text-surface-400">{movie.genres.join(" · ")}</p>
      </div>
    </Link>
  );
}
