import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { buildSeatGrid } from '../src/events/builders/seat-grid.builder';

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

async function seedSeatedEvent(organizerId: string, venueId: string) {
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
      title: 'The Life Comedy',
      description: 'A one-night theatre play with assigned seating.',
      startsAt,
      venueId,
      organizerId,
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

async function main() {
  const passwordHash = await argon2.hash(SEED_PASSWORD);
  const { organizer } = await seedUsers(passwordHash);
  const venue = await seedVenue();
  await seedSeatedEvent(organizer.id, venue.id);
  await seedGeneralAdmissionEvent(organizer.id, venue.id);

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
