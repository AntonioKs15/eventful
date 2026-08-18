import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { buildSeatGrid } from '../src/events/builders/seat-grid.builder';
import { generateTicketPublicCode } from '../src/tickets/ticket-public-code.util';

const prisma = new PrismaClient();

const SEED_PASSWORD = 'ChangeMe123!';
const SEATED_EVENT_ROWS = 5;
const SEATED_EVENT_COLUMNS = 8;
const SEATED_EVENT_CAPACITY = SEATED_EVENT_ROWS * SEATED_EVENT_COLUMNS;
const GENERAL_ADMISSION_CAPACITY = 200;
const DAYS_UNTIL_SEATED_EVENT = 30;
const DAYS_UNTIL_GENERAL_ADMISSION_EVENT = 45;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

async function upsertUser(
  email: string,
  name: string,
  role: 'ORGANIZER' | 'CUSTOMER' | 'GATE',
  passwordHash: string,
) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash },
  });
}

async function seedUsers(passwordHash: string) {
  const organizer = await upsertUser(
    'organizer@eventful.test',
    'Olivia Organizer',
    'ORGANIZER',
    passwordHash,
  );
  const customerOne = await upsertUser(
    'customer1@eventful.test',
    'Carlos Customer',
    'CUSTOMER',
    passwordHash,
  );
  const customerTwo = await upsertUser(
    'customer2@eventful.test',
    'Camila Customer',
    'CUSTOMER',
    passwordHash,
  );
  const gate = await upsertUser(
    'gate@eventful.test',
    'Gil Gatekeeper',
    'GATE',
    passwordHash,
  );

  return { organizer, customerOne, customerTwo, gate };
}

async function seedVenue() {
  return prisma.venue.upsert({
    where: {
      source_externalId: {
        source: 'MANUAL',
        externalId: 'seed-municipal-theatre',
      },
    },
    update: {},
    create: {
      name: 'Municipal Theatre',
      city: 'São Paulo',
      address: 'Praça Ramos de Azevedo, s/n',
      source: 'MANUAL',
      externalId: 'seed-municipal-theatre',
    },
  });
}

async function seedSeatedEvent(
  organizerId: string,
  venueId: string,
  movieId: string,
) {
  const existing = await prisma.event.findFirst({
    where: { catalogSourceId: 'seed-seated-event' },
  });
  if (existing) {
    return existing;
  }

  const startsAt = new Date(
    Date.now() + DAYS_UNTIL_SEATED_EVENT * MILLISECONDS_PER_DAY,
  );

  const event = await prisma.event.create({
    data: {
      title: 'Black Panther',
      description: 'A one-night showtime with assigned seating.',
      startsAt,
      venueId,
      organizerId,
      movieId,
      capacity: SEATED_EVENT_CAPACITY,
      priceCents: 5000,
      layoutType: 'SEATED',
      status: 'PUBLISHED',
      catalogSourceId: 'seed-seated-event',
      seatMap: {
        create: {
          rows: SEATED_EVENT_ROWS,
          columns: SEATED_EVENT_COLUMNS,
          seats: {
            create: buildSeatGrid(SEATED_EVENT_ROWS, SEATED_EVENT_COLUMNS),
          },
        },
      },
    },
  });

  return event;
}

async function upsertActor(name: string, photoUrl: string, bio: string) {
  const existing = await prisma.actor.findFirst({ where: { name } });
  if (existing) {
    return existing;
  }
  return prisma.actor.create({ data: { name, photoUrl, bio } });
}

async function seedActors() {
  const brie = await upsertActor(
    'Brie Larson',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
    'Academy Award-winning actress known for her roles in independent dramas and blockbuster franchises.',
  );
  const chadwick = await upsertActor(
    'Chadwick Boseman',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e',
    'Celebrated for bringing gravity and warmth to iconic leading roles.',
  );
  const scarlett = await upsertActor(
    'Scarlett Johansson',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9',
    'One of the highest-grossing actresses of all time, known for both blockbuster and independent films.',
  );

  return { brie, chadwick, scarlett };
}

async function upsertMovie(
  data: Omit<Parameters<typeof prisma.movie.create>[0]['data'], 'id'>,
) {
  const existing = await prisma.movie.findFirst({
    where: { title: data.title },
  });
  if (existing) {
    return existing;
  }
  return prisma.movie.create({ data });
}

async function seedMovies(cast: {
  brie: { id: string };
  chadwick: { id: string };
  scarlett: { id: string };
}) {
  const nowPlaying = await upsertMovie({
    title: 'Black Panther',
    synopsis:
      'Thousands of years ago, five African tribes war over a meteorite containing vibranium. One warrior ingests a "heart-shaped herb" and gains the powers of the Black Panther.',
    durationMinutes: 134,
    genres: ['Action', 'Adventure'],
    releaseDate: new Date(Date.now() - 10 * MILLISECONDS_PER_DAY),
    posterImageUrl:
      'https://images.unsplash.com/photo-1478720568477-152d9b164e26',
    backdropImageUrl:
      'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba',
    ratingLabel: '14',
    status: 'NOW_PLAYING',
  });

  const comingSoon = await upsertMovie({
    title: 'The Marvels',
    synopsis:
      'Carol Danvers gets her powers entangled with those of Kamala Khan and Monica Rambeau, forcing them to work together to save the universe.',
    durationMinutes: 105,
    genres: ['Action', 'Sci-Fi'],
    releaseDate: new Date(Date.now() + 20 * MILLISECONDS_PER_DAY),
    posterImageUrl:
      'https://images.unsplash.com/photo-1440404653325-ab127d49abc1',
    ratingLabel: 'L',
    status: 'COMING_SOON',
  });

  await prisma.movieActor.upsert({
    where: {
      movieId_actorId: { movieId: nowPlaying.id, actorId: cast.chadwick.id },
    },
    update: {},
    create: {
      movieId: nowPlaying.id,
      actorId: cast.chadwick.id,
      characterName: "T'Challa / Black Panther",
      billingOrder: 0,
    },
  });
  await prisma.movieActor.upsert({
    where: {
      movieId_actorId: { movieId: nowPlaying.id, actorId: cast.scarlett.id },
    },
    update: {},
    create: {
      movieId: nowPlaying.id,
      actorId: cast.scarlett.id,
      characterName: 'Guest appearance',
      billingOrder: 1,
    },
  });
  await prisma.movieActor.upsert({
    where: {
      movieId_actorId: { movieId: comingSoon.id, actorId: cast.brie.id },
    },
    update: {},
    create: {
      movieId: comingSoon.id,
      actorId: cast.brie.id,
      characterName: 'Carol Danvers / Captain Marvel',
      billingOrder: 0,
    },
  });

  return { nowPlaying, comingSoon };
}

const TMDB_POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE_URL = 'https://image.tmdb.org/t/p/w1280';
const TMDB_SEED_RATING_LABEL = '14';
const TMDB_SEED_FALLBACK_DURATION_MINUTES = 120;

interface TmdbMovieDetail {
  id: number;
  title: string;
  overview: string;
  release_date: string;
  poster_path: string | null;
  backdrop_path: string | null;
  runtime: number | null;
  genres: { id: number; name: string }[];
}

// Stable, well-known TMDb ids (not a live "now playing" feed) so the seed stays
// deterministic across runs and reviewers see the same catalog every time.
const CURATED_TMDB_MOVIES: {
  id: number;
  status: 'NOW_PLAYING' | 'COMING_SOON';
}[] = [
  { id: 27205, status: 'NOW_PLAYING' }, // Inception
  { id: 155, status: 'NOW_PLAYING' }, // The Dark Knight
  { id: 872585, status: 'NOW_PLAYING' }, // Oppenheimer
  { id: 693134, status: 'COMING_SOON' }, // Dune: Part Two
  { id: 634649, status: 'COMING_SOON' }, // Spider-Man: No Way Home
];

async function fetchTmdbMovieDetail(
  id: number,
  apiKey: string,
): Promise<TmdbMovieDetail | null> {
  try {
    const response = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=en-US`,
    );
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as TmdbMovieDetail;
  } catch {
    return null;
  }
}

async function seedMoviesFromTmdb() {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    console.log('TMDB_API_KEY not set, skipping extra TMDb-sourced movies.');
    return;
  }

  for (const { id, status } of CURATED_TMDB_MOVIES) {
    const detail = await fetchTmdbMovieDetail(id, apiKey);
    if (!detail || !detail.poster_path) {
      continue;
    }

    await upsertMovie({
      title: detail.title,
      synopsis: detail.overview,
      durationMinutes: detail.runtime || TMDB_SEED_FALLBACK_DURATION_MINUTES,
      genres: detail.genres.map((genre) => genre.name),
      releaseDate: new Date(detail.release_date || Date.now()),
      posterImageUrl: `${TMDB_POSTER_BASE_URL}${detail.poster_path}`,
      backdropImageUrl: detail.backdrop_path
        ? `${TMDB_BACKDROP_BASE_URL}${detail.backdrop_path}`
        : null,
      ratingLabel: TMDB_SEED_RATING_LABEL,
      status,
      catalogSourceId: String(detail.id),
    });
  }
}

async function seedGeneralAdmissionEvent(organizerId: string, venueId: string) {
  const existing = await prisma.event.findFirst({
    where: { catalogSourceId: 'seed-general-admission-event' },
  });
  if (existing) {
    return existing;
  }

  const startsAt = new Date(
    Date.now() + DAYS_UNTIL_GENERAL_ADMISSION_EVENT * MILLISECONDS_PER_DAY,
  );

  return prisma.event.create({
    data: {
      title: 'Summer Sound Festival',
      description: 'An outdoor, general-admission music festival.',
      startsAt,
      venueId,
      organizerId,
      capacity: GENERAL_ADMISSION_CAPACITY,
      priceCents: 8000,
      layoutType: 'GENERAL_ADMISSION',
      status: 'PUBLISHED',
      catalogSourceId: 'seed-general-admission-event',
      generalAdmissionPool: {
        create: { capacity: GENERAL_ADMISSION_CAPACITY, sold: 0 },
      },
    },
  });
}

async function seedTicketAndReview(
  customerId: string,
  eventId: string,
  movieId: string,
) {
  const existingTicket = await prisma.ticket.findFirst({
    where: { customerId, eventId },
  });
  const ticket =
    existingTicket ??
    (await prisma.ticket.create({
      data: {
        reservationId: (
          await prisma.reservation.create({
            data: {
              eventId,
              customerId,
              status: 'CONFIRMED',
              expiresAt: new Date(Date.now() + MILLISECONDS_PER_DAY),
            },
          })
        ).id,
        eventId,
        customerId,
        status: 'ISSUED',
        qrPublicCode: generateTicketPublicCode(),
      },
    }));

  await prisma.review.upsert({
    where: { movieId_userId: { movieId, userId: customerId } },
    update: {},
    create: {
      movieId,
      userId: customerId,
      rating: 5,
      comment: 'Incredible visuals and a story with real heart. Loved it!',
    },
  });

  return ticket;
}

async function seedNotifications(userId: string) {
  const existing = await prisma.notification.findFirst({ where: { userId } });
  if (existing) {
    return;
  }

  await prisma.notification.createMany({
    data: [
      {
        userId,
        type: 'TICKET_ISSUED',
        title: 'Your ticket is ready',
        message: 'Your ticket for Black Panther has been issued.',
      },
      {
        userId,
        type: 'RESERVATION_EXPIRING_SOON',
        title: 'Your reservation is expiring soon',
        message: 'Your hold for Summer Sound Festival expires soon.',
        readAt: new Date(),
      },
    ],
  });
}

async function main() {
  const passwordHash = await argon2.hash(SEED_PASSWORD);
  const { organizer, customerOne } = await seedUsers(passwordHash);
  const venue = await seedVenue();
  const cast = await seedActors();
  const { nowPlaying } = await seedMovies(cast);
  const seatedEvent = await seedSeatedEvent(
    organizer.id,
    venue.id,
    nowPlaying.id,
  );
  await seedGeneralAdmissionEvent(organizer.id, venue.id);
  await seedTicketAndReview(customerOne.id, seatedEvent.id, nowPlaying.id);
  await seedNotifications(customerOne.id);
  await seedMoviesFromTmdb();

  console.log(
    'Seed completed. Shared password for all seeded users:',
    SEED_PASSWORD,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
