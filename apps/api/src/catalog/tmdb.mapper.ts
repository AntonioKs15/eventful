const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';

// TMDb's genre id -> name mapping is a small, stable, publicly documented list
// (https://developer.themoviedb.org/reference/genre-movie-list); hardcoding it
// avoids an extra network round trip on every catalog search.
const TMDB_GENRE_NAMES: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  18: 'Drama',
  10751: 'Family',
  14: 'Fantasy',
  36: 'History',
  27: 'Horror',
  10402: 'Music',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Science Fiction',
  10770: 'TV Movie',
  53: 'Thriller',
  10752: 'War',
  37: 'Western',
};

interface TmdbMovie {
  id?: number;
  title?: string;
  overview?: string;
  release_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
}

export interface CatalogMovieSummary {
  externalId: string;
  title: string;
  synopsis: string;
  releaseDate: string | null;
  posterImageUrl: string | null;
  backdropImageUrl: string | null;
  genres: string[];
}

export function mapTmdbMovieToSummary(raw: unknown): CatalogMovieSummary {
  const movie = raw as TmdbMovie;

  return {
    externalId: movie.id !== undefined ? String(movie.id) : '',
    title: movie.title ?? '',
    synopsis: movie.overview ?? '',
    releaseDate: movie.release_date || null,
    posterImageUrl: movie.poster_path
      ? `${TMDB_POSTER_BASE_URL}${movie.poster_path}`
      : null,
    backdropImageUrl: movie.backdrop_path
      ? `${TMDB_BACKDROP_BASE_URL}${movie.backdrop_path}`
      : null,
    genres: (movie.genre_ids ?? [])
      .map((id) => TMDB_GENRE_NAMES[id])
      .filter((name): name is string => Boolean(name)),
  };
}
