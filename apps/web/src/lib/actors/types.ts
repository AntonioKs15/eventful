export interface ActorSummary {
  id: string;
  name: string;
  photoUrl: string | null;
  bio: string | null;
}

export interface FilmographyEntry {
  characterName: string;
  movie: {
    id: string;
    title: string;
    posterImageUrl: string;
    releaseDate: string;
  };
}

export interface ActorDetail extends ActorSummary {
  filmography: FilmographyEntry[];
}
