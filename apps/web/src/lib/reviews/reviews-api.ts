import { apiRequest } from "../api/api-client";
import { Review } from "./types";

export interface CreateReviewInput {
  movieId: string;
  rating: number;
  comment: string;
}

export function createReview(input: CreateReviewInput): Promise<Review> {
  return apiRequest("/reviews", { method: "POST", body: input });
}
