import { MovieStatus } from '@eventful/contracts';
import { MoviesService } from './movies.service';

function createMockLogger() {
  return {
    setContext: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

function createService() {
  const prisma = {
    movie: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  };
  const actorsService = { findById: jest.fn() };
  const service = new MoviesService(
    prisma as never,
    actorsService as never,
    createMockLogger() as never,
  );
  return { service, prisma };
}

describe('MoviesService', () => {
  describe('create', () => {
    it('defaults status to COMING_SOON when the caller omits it', async () => {
      const { service, prisma } = createService();
      prisma.movie.create.mockResolvedValue({ id: 'movie-1' });

      await service.create({
        title: 'Untitled',
        synopsis: 'A movie.',
        durationMinutes: 100,
        genres: ['Drama'],
        releaseDate: new Date('2026-01-01'),
        posterImageUrl: 'https://example.com/poster.jpg',
        ratingLabel: '14',
      });

      expect(prisma.movie.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: MovieStatus.COMING_SOON }),
        }),
      );
    });

    it('respects an explicitly provided status', async () => {
      const { service, prisma } = createService();
      prisma.movie.create.mockResolvedValue({ id: 'movie-1' });

      await service.create({
        title: 'Untitled',
        synopsis: 'A movie.',
        durationMinutes: 100,
        genres: ['Drama'],
        releaseDate: new Date('2026-01-01'),
        posterImageUrl: 'https://example.com/poster.jpg',
        ratingLabel: '14',
        status: MovieStatus.NOW_PLAYING,
      });

      expect(prisma.movie.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: MovieStatus.NOW_PLAYING }),
        }),
      );
    });
  });

  describe('update', () => {
    it('does not overwrite status when the update payload omits it (regression)', async () => {
      const { service, prisma } = createService();
      prisma.movie.findUnique.mockResolvedValue({ id: 'movie-1' });
      prisma.movie.update.mockResolvedValue({ id: 'movie-1' });

      await service.update('movie-1', { durationMinutes: 135 });

      const call = prisma.movie.update.mock.calls[0][0];
      expect(call.data.status).toBeUndefined();
      expect(call.data.durationMinutes).toBe(135);
    });
  });
});
