export interface Review {
  id: string;
  movieId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
  user: { name: string };
}
