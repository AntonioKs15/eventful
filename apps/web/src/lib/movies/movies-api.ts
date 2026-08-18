import { MovieStatus, PaginatedResult } from "@eventful/contracts";
import { apiRequest } from "../api/api-client";
import { EventSummary } from "../events/types";
import { Review } from "../reviews/types";
import { MovieDetail, MovieSummary } from "./types";

export interface ListMoviesQuery {
  status?: MovieStatus;
  search?: string;
  page: number;
  pageSize: number;
}

export interface CreateMovieInput {
  title: string;
  synopsis: string;
  durationMinutes: number;
  genres: string[];
  releaseDate: string;
  posterImageUrl: string;
  backdropImageUrl?: string;
  trailerUrl?: string;
  ratingLabel: string;
  status?: MovieStatus;
  catalogSourceId?: string;
}

export interface AttachCastInput {
  actorId: string;
  characterName: string;
  billingOrder?: number;
}

export function listMovies(query: ListMoviesQuery): Promise<PaginatedResult<MovieSummary>> {
  return apiRequest("/movies", {
    query: {
      status: query.status,
      search: query.search,
      page: query.page,
      pageSize: query.pageSize,
    },
  });
}

export function getMovie(id: string): Promise<MovieDetail> {
  return apiRequest(`/movies/${id}`);
}

export function getMovieShowtimes(
  id: string,
  query: { page: number; pageSize: number },
): Promise<PaginatedResult<EventSummary>> {
  return apiRequest(`/movies/${id}/showtimes`, { query });
}

export function getMovieReviews(
  id: string,
  query: { page: number; pageSize: number },
): Promise<PaginatedResult<Review>> {
  return apiRequest(`/movies/${id}/reviews`, { query });
}

export function createMovie(input: CreateMovieInput): Promise<MovieSummary> {
  return apiRequest("/movies", { method: "POST", body: input });
}

export function attachCast(movieId: string, input: AttachCastInput) {
  return apiRequest(`/movies/${movieId}/cast`, { method: "POST", body: input });
}

export function detachCast(movieId: string, actorId: string): Promise<void> {
  return apiRequest(`/movies/${movieId}/cast/${actorId}`, { method: "DELETE" });
}
