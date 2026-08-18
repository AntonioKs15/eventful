import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EventLayoutType,
  EventStatus,
  ReservationStatus,
} from '@eventful/contracts';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

const CUSTOMER_EMAIL = 'customer1@eventful.test';
const CUSTOMER_PASSWORD = 'ChangeMe123!';
const CONCURRENCY_TEST_TIMEOUT_MS = 60000;

describe('Reservation concurrency (e2e, live database)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken: string;
  let venueId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: CUSTOMER_EMAIL, password: CUSTOMER_PASSWORD });
    accessToken = loginResponse.body.accessToken;

    const venue = await prisma.venue.create({
      data: {
        name: 'Concurrency Test Venue',
        city: 'Test City',
        address: 'Test Address',
        source: 'MANUAL',
      },
    });
    venueId = venue.id;
  });

  afterAll(async () => {
    await prisma.reservationSeat.deleteMany({
      where: { seat: { seatMap: { event: { venueId } } } },
    });
    await prisma.reservation.deleteMany({ where: { event: { venueId } } });
    await prisma.seat.deleteMany({
      where: { seatMap: { event: { venueId } } },
    });
    await prisma.seatMap.deleteMany({ where: { event: { venueId } } });
    await prisma.generalAdmissionPool.deleteMany({
      where: { event: { venueId } },
    });
    await prisma.event.deleteMany({ where: { venueId } });
    await prisma.venue.delete({ where: { id: venueId } });
    await app.close();
  });

  it(
    'never oversells a GENERAL_ADMISSION pool under concurrent requests',
    async () => {
      const capacity = 5;
      const concurrentRequests = 12;

      const organizer = await prisma.user.findUniqueOrThrow({
        where: { email: 'organizer@eventful.test' },
      });
      const event = await prisma.event.create({
        data: {
          title: 'Concurrency GA Event',
          description: 'test',
          startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          venueId,
          organizerId: organizer.id,
          capacity,
          priceCents: 1000,
          layoutType: EventLayoutType.GENERAL_ADMISSION,
          status: EventStatus.PUBLISHED,
          generalAdmissionPool: { create: { capacity, sold: 0 } },
        },
      });

      const responses = await Promise.all(
        Array.from({ length: concurrentRequests }).map(() =>
          request(app.getHttpServer())
            .post('/reservations')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ eventId: event.id, quantity: 1 }),
        ),
      );

      const successes = responses.filter((response) => response.status === 201);
      const failures = responses.filter((response) => response.status === 409);

      expect(successes).toHaveLength(capacity);
      expect(failures).toHaveLength(concurrentRequests - capacity);
      failures.forEach((response) => {
        expect(response.body.error.code).toBe('INSUFFICIENT_CAPACITY');
      });

      const pool = await prisma.generalAdmissionPool.findUniqueOrThrow({
        where: { eventId: event.id },
      });
      expect(pool.sold).toBe(capacity);

      const confirmedReservations = await prisma.reservation.count({
        where: { eventId: event.id, status: ReservationStatus.PENDING },
      });
      expect(confirmedReservations).toBe(capacity);
    },
    CONCURRENCY_TEST_TIMEOUT_MS,
  );

  it(
    'never lets two reservations hold the same seat under concurrent requests',
    async () => {
      const concurrentRequests = 10;

      const organizer = await prisma.user.findUniqueOrThrow({
        where: { email: 'organizer@eventful.test' },
      });
      const event = await prisma.event.create({
        data: {
          title: 'Concurrency Seated Event',
          description: 'test',
          startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          venueId,
          organizerId: organizer.id,
          capacity: 1,
          priceCents: 1000,
          layoutType: EventLayoutType.SEATED,
          status: EventStatus.PUBLISHED,
          seatMap: {
            create: {
              rows: 1,
              columns: 1,
              seats: { create: [{ rowLabel: 'A', seatNumber: 1 }] },
            },
          },
        },
        include: { seatMap: { include: { seats: true } } },
      });
      const contestedSeatId = event.seatMap!.seats[0].id;

      const responses = await Promise.all(
        Array.from({ length: concurrentRequests }).map(() =>
          request(app.getHttpServer())
            .post('/reservations')
            .set('Authorization', `Bearer ${accessToken}`)
            .send({ eventId: event.id, seatIds: [contestedSeatId] }),
        ),
      );

      const successes = responses.filter((response) => response.status === 201);
      const failures = responses.filter((response) => response.status === 409);

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(concurrentRequests - 1);
      failures.forEach((response) => {
        expect(response.body.error.code).toBe('SEAT_ALREADY_TAKEN');
      });

      const holds = await prisma.reservationSeat.count({
        where: { seatId: contestedSeatId },
      });
      expect(holds).toBe(1);
    },
    CONCURRENCY_TEST_TIMEOUT_MS,
  );
});
