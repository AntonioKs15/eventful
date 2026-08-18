import { mapTmdbMovieToSummary } from './tmdb.mapper';

describe('mapTmdbMovieToSummary', () => {
  it('maps a fully-populated TMDb movie to a catalog summary', () => {
    const raw = {
      id: 505642,
      title: 'Black Panther: Wakanda Forever',
      overview:
        'Queen Ramonda, Shuri, M’Baku, Okoye and the Dora Milaje fight to protect their nation.',
      release_date: '2022-11-09',
      poster_path: '/sv1xJUazXeYqALzczSZ3O6nkH75.jpg',
      backdrop_path: '/xDMIl84Qo5Tsu62c9DGWhmPI67A.jpg',
      genre_ids: [28, 12, 18],
    };

    const summary = mapTmdbMovieToSummary(raw);

    expect(summary).toEqual({
      externalId: '505642',
      title: 'Black Panther: Wakanda Forever',
      synopsis:
        'Queen Ramonda, Shuri, M’Baku, Okoye and the Dora Milaje fight to protect their nation.',
      releaseDate: '2022-11-09',
      posterImageUrl:
        'https://image.tmdb.org/t/p/w500/sv1xJUazXeYqALzczSZ3O6nkH75.jpg',
      backdropImageUrl:
        'https://image.tmdb.org/t/p/w1280/xDMIl84Qo5Tsu62c9DGWhmPI67A.jpg',
      genres: ['Action', 'Adventure', 'Drama'],
    });
  });

  it('fills in nulls and empty values for a sparse movie instead of throwing', () => {
    const raw = { id: 1, title: 'Mystery Movie' };

    const summary = mapTmdbMovieToSummary(raw);

    expect(summary).toEqual({
      externalId: '1',
      title: 'Mystery Movie',
      synopsis: '',
      releaseDate: null,
      posterImageUrl: null,
      backdropImageUrl: null,
      genres: [],
    });
  });

  it('drops unknown genre ids rather than including undefined entries', () => {
    const raw = { id: 2, title: 'Genre Test', genre_ids: [28, 999999] };

    const summary = mapTmdbMovieToSummary(raw);

    expect(summary.genres).toEqual(['Action']);
  });
});
