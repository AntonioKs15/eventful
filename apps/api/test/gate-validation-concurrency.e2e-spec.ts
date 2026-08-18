import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  EventLayoutType,
  EventStatus,
  TicketStatus,
} from '@eventful/contracts';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { QrService } from '../src/tickets/qr.service';

const GATE_EMAIL = 'gate@eventful.test';
const GATE_PASSWORD = 'ChangeMe123!';
const CONCURRENCY_TEST_TIMEOUT_MS = 60000;

describe('Gate validation concurrency (e2e, live database)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let qrService: QrService;
  let gateAccessToken: string;
  let venueId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    qrService = app.get(QrService);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: GATE_EMAIL, password: GATE_PASSWORD });
    gateAccessToken = loginResponse.body.accessToken;

    const venue = await prisma.venue.create({
      data: {
        name: 'Gate Concurrency Test Venue',
        city: 'Test City',
        address: 'Test Address',
        source: 'MANUAL',
      },
    });
    venueId = venue.id;
  });

  afterAll(async () => {
    await prisma.ticket.deleteMany({ where: { event: { venueId } } });
    await prisma.reservation.deleteMany({ where: { event: { venueId } } });
    await prisma.generalAdmissionPool.deleteMany({
      where: { event: { venueId } },
    });
    await prisma.event.deleteMany({ where: { venueId } });
    await prisma.venue.delete({ where: { id: venueId } });
    await app.close();
  });

  it(
    'lets exactly one of many simultaneous scans of the same ticket succeed',
    async () => {
      const concurrentRequests = 10;

      const organizer = await prisma.user.findUniqueOrThrow({
        where: { email: 'organizer@eventful.test' },
      });
      const customer = await prisma.user.findUniqueOrThrow({
        where: { email: 'customer1@eventful.test' },
      });
      const event = await prisma.event.create({
        data: {
          title: 'Gate Concurrency Event',
          description: 'test',
          startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
          venueId,
          organizerId: organizer.id,
          capacity: 100,
          priceCents: 1000,
          layoutType: EventLayoutType.GENERAL_ADMISSION,
          status: EventStatus.PUBLISHED,
          generalAdmissionPool: { create: { capacity: 100, sold: 0 } },
        },
      });
      const reservation = await prisma.reservation.create({
        data: {
          eventId: event.id,
          customerId: customer.id,
          status: 'CONFIRMED',
          quantity: 1,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        },
      });
      const ticket = await prisma.ticket.create({
        data: {
          eventId: event.id,
          customerId: customer.id,
          reservationId: reservation.id,
          status: TicketStatus.ISSUED,
          qrPublicCode: `gate-concurrency-${Date.now()}`,
        },
      });
      const payload = qrService.buildPayload(ticket.id);

      const responses = await Promise.all(
        Array.from({ length: concurrentRequests }).map(() =>
          request(app.getHttpServer())
            .post('/gate/validate')
            .set('Authorization', `Bearer ${gateAccessToken}`)
            .send({ eventId: event.id, payload }),
        ),
      );

      const valid = responses.filter(
        (response) => response.body.result === 'VALID',
      );
      const alreadyUsed = responses.filter(
        (response) => response.body.result === 'ALREADY_USED',
      );

      expect(valid).toHaveLength(1);
      expect(alreadyUsed).toHaveLength(concurrentRequests - 1);

      const finalTicket = await prisma.ticket.findUniqueOrThrow({
        where: { id: ticket.id },
      });
      expect(finalTicket.status).toBe(TicketStatus.USED);
    },
    CONCURRENCY_TEST_TIMEOUT_MS,
  );

  it('never reveals whether a forged signature belongs to a real ticket', async () => {
    const organizer = await prisma.user.findUniqueOrThrow({
      where: { email: 'organizer@eventful.test' },
    });
    const event = await prisma.event.create({
      data: {
        title: 'Gate Forgery Test Event',
        description: 'test',
        startsAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        venueId,
        organizerId: organizer.id,
        capacity: 10,
        priceCents: 1000,
        layoutType: EventLayoutType.GENERAL_ADMISSION,
        status: EventStatus.PUBLISHED,
        generalAdmissionPool: { create: { capacity: 10, sold: 0 } },
      },
    });

    const forgedRealId = `${Buffer.from('real-looking-id').toString('hex')}.deadbeef`;
    const forgedUnknownId = 'totally-unknown-id.deadbeef';

    const [responseA, responseB] = await Promise.all([
      request(app.getHttpServer())
        .post('/gate/validate')
        .set('Authorization', `Bearer ${gateAccessToken}`)
        .send({ eventId: event.id, payload: forgedRealId }),
      request(app.getHttpServer())
        .post('/gate/validate')
        .set('Authorization', `Bearer ${gateAccessToken}`)
        .send({ eventId: event.id, payload: forgedUnknownId }),
    ]);

    expect(responseA.body).toEqual({ result: 'NOT_FOUND', ticket: null });
    expect(responseB.body).toEqual({ result: 'NOT_FOUND', ticket: null });
  });
});
