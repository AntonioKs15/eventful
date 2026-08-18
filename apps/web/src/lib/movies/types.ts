import { MovieStatus } from "@eventful/contracts";

export interface MovieSummary {
  id: string;
  title: string;
  synopsis: string;
  durationMinutes: number;
  genres: string[];
  releaseDate: string;
  posterImageUrl: string;
  backdropImageUrl: string | null;
  trailerUrl: string | null;
  ratingLabel: string;
  status: MovieStatus;
}

export interface CastMember {
  id: string;
  characterName: string;
  billingOrder: number;
  actor: {
    id: string;
    name: string;
    photoUrl: string | null;
  };
}

export interface MovieDetail extends MovieSummary {
  cast: CastMember[];
  averageRating: number | null;
  reviewCount: number;
}
