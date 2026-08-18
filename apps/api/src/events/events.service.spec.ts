import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventLayoutType, EventStatus } from '@eventful/contracts';
import { CreateEventDto } from './dto/create-event.dto';
import { EventNotFoundException } from './exceptions/event-not-found.exception';
import { VenueNotFoundException } from './exceptions/venue-not-found.exception';
import { EventsService } from './events.service';

function createMockLogger() {
  return {
    setContext: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

const existingVenue = {
  id: 'venue-1',
  name: 'Existing Hall',
  city: 'SP',
  address: 'Rua X',
};

function createService() {
  const prisma = {
    event: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    seatMap: {
      findUnique: jest.fn(),
    },
  };
  const venuesService = {
    findById: jest.fn(),
    createManual: jest.fn(),
    findOrCreateFromCatalog: jest.fn(),
  };
  const service = new EventsService(
    prisma as never,
    venuesService as never,
    createMockLogger() as never,
  );
  return { service, prisma, venuesService };
}

const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

function seatedDto(
  overrides: Partial<{
    capacity: number;
    seatMap: { rows: number; columns: number } | undefined;
  }> = {},
) {
  return {
    title: 'Play',
    description: 'A play',
    startsAt: futureDate,
    capacity: overrides.capacity ?? 40,
    priceCents: 1000,
    layoutType: EventLayoutType.SEATED,
    venue: { id: 'venue-1' },
    seatMap:
      'seatMap' in overrides ? overrides.seatMap : { rows: 5, columns: 8 },
  } as unknown as CreateEventDto;
}

function generalAdmissionDto(withSeatMap = false) {
  return {
    title: 'Festival',
    description: 'A festival',
    startsAt: futureDate,
    capacity: 200,
    priceCents: 2000,
    layoutType: EventLayoutType.GENERAL_ADMISSION,
    venue: { id: 'venue-1' },
    seatMap: withSeatMap ? { rows: 5, columns: 8 } : undefined,
  } as unknown as CreateEventDto;
}

describe('EventsService.createEvent', () => {
  it('rejects a SEATED event whose capacity does not match rows × columns', async () => {
    const { service, venuesService } = createService();
    venuesService.findById.mockResolvedValue(existingVenue);

    await expect(
      service.createEvent('organizer-1', seatedDto({ capacity: 999 })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a SEATED event with no seat map', async () => {
    const { service, venuesService } = createService();
    venuesService.findById.mockResolvedValue(existingVenue);

    await expect(
      service.createEvent('organizer-1', seatedDto({ seatMap: undefined })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a GENERAL_ADMISSION event that includes a seat map', async () => {
    const { service, venuesService } = createService();
    venuesService.findById.mockResolvedValue(existingVenue);

    await expect(
      service.createEvent('organizer-1', generalAdmissionDto(true)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reuses an existing venue when venue.id is provided', async () => {
    const { service, prisma, venuesService } = createService();
    venuesService.findById.mockResolvedValue(existingVenue);
    prisma.event.create.mockResolvedValue({ id: 'event-1' });

    await service.createEvent('organizer-1', seatedDto());

    expect(venuesService.findById).toHaveBeenCalledWith('venue-1');
    expect(venuesService.createManual).not.toHaveBeenCalled();
    expect(venuesService.findOrCreateFromCatalog).not.toHaveBeenCalled();
  });

  it('throws VenueNotFoundException when venue.id does not resolve to a venue', async () => {
    const { service, venuesService } = createService();
    venuesService.findById.mockResolvedValue(null);

    await expect(
      service.createEvent('organizer-1', seatedDto()),
    ).rejects.toBeInstanceOf(VenueNotFoundException);
  });

  it('creates a manual venue when venue fields are given without an id or externalId', async () => {
    const { service, prisma, venuesService } = createService();
    venuesService.createManual.mockResolvedValue(existingVenue);
    prisma.event.create.mockResolvedValue({ id: 'event-1' });

    const dto = generalAdmissionDto();
    dto.venue = { name: 'New Hall', city: 'RJ', address: 'Rua Y' };

    await service.createEvent('organizer-1', dto);

    expect(venuesService.createManual).toHaveBeenCalledWith({
      name: 'New Hall',
      city: 'RJ',
      address: 'Rua Y',
    });
  });

  it('resolves a catalog venue when venue.externalId is given', async () => {
    const { service, prisma, venuesService } = createService();
    venuesService.findOrCreateFromCatalog.mockResolvedValue(existingVenue);
    prisma.event.create.mockResolvedValue({ id: 'event-1' });

    const dto = generalAdmissionDto();
    dto.venue = {
      name: 'TM Hall',
      city: 'RJ',
      address: 'Rua Z',
      externalId: 'tm-venue-1',
    };

    await service.createEvent('organizer-1', dto);

    expect(venuesService.findOrCreateFromCatalog).toHaveBeenCalledWith({
      name: 'TM Hall',
      city: 'RJ',
      address: 'Rua Z',
      externalId: 'tm-venue-1',
    });
  });

  it('creates the seat map rows for a SEATED event', async () => {
    const { service, prisma, venuesService } = createService();
    venuesService.findById.mockResolvedValue(existingVenue);
    prisma.event.create.mockResolvedValue({ id: 'event-1' });

    await service.createEvent('organizer-1', seatedDto());

    const createArgs = prisma.event.create.mock.calls[0][0];
    expect(createArgs.data.seatMap.create.rows).toBe(5);
    expect(createArgs.data.seatMap.create.seats.create).toHaveLength(40);
    expect(createArgs.data.generalAdmissionPool).toBeUndefined();
  });

  it('creates a general admission pool for a GENERAL_ADMISSION event', async () => {
    const { service, prisma, venuesService } = createService();
    venuesService.findById.mockResolvedValue(existingVenue);
    prisma.event.create.mockResolvedValue({ id: 'event-1' });

    await service.createEvent('organizer-1', generalAdmissionDto());

    const createArgs = prisma.event.create.mock.calls[0][0];
    expect(createArgs.data.generalAdmissionPool.create).toEqual({
      capacity: 200,
      sold: 0,
    });
    expect(createArgs.data.seatMap).toBeUndefined();
  });
});

describe('EventsService.publish', () => {
  function createPublishService() {
    return createService();
  }

  it('throws EventNotFoundException when the event does not exist', async () => {
    const { service, prisma } = createPublishService();
    prisma.event.findUnique.mockResolvedValue(null);

    await expect(
      service.publish('organizer-1', 'event-1'),
    ).rejects.toBeInstanceOf(EventNotFoundException);
  });

  it('throws ForbiddenException when a different organizer tries to publish the event', async () => {
    const { service, prisma } = createPublishService();
    prisma.event.findUnique.mockResolvedValue({
      id: 'event-1',
      organizerId: 'organizer-1',
      status: EventStatus.DRAFT,
    });

    await expect(
      service.publish('organizer-2', 'event-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('publishes a DRAFT event owned by the requesting organizer', async () => {
    const { service, prisma } = createPublishService();
    prisma.event.findUnique.mockResolvedValue({
      id: 'event-1',
      organizerId: 'organizer-1',
      status: EventStatus.DRAFT,
    });
    prisma.event.update.mockResolvedValue({
      id: 'event-1',
      status: EventStatus.PUBLISHED,
    });

    const result = await service.publish('organizer-1', 'event-1');

    expect(prisma.event.update).toHaveBeenCalledWith({
      where: { id: 'event-1' },
      data: { status: EventStatus.PUBLISHED },
    });
    expect(result.status).toBe(EventStatus.PUBLISHED);
  });
});

describe('EventsService.getSeatAvailability', () => {
  it('returns null for a GENERAL_ADMISSION event with no seat map', async () => {
    const { service, prisma } = createService();
    prisma.seatMap.findUnique.mockResolvedValue(null);

    const result = await service.getSeatAvailability('event-1');

    expect(result).toBeNull();
  });

  it('marks a seat unavailable only when it has a live reservation hold', async () => {
    const { service, prisma } = createService();
    prisma.seatMap.findUnique.mockResolvedValue({
      rows: 1,
      columns: 2,
      seats: [
        { id: 'seat-1', rowLabel: 'A', seatNumber: 1, reservationSeats: [] },
        {
          id: 'seat-2',
          rowLabel: 'A',
          seatNumber: 2,
          reservationSeats: [{ id: 'hold-1' }],
        },
      ],
    });

    const result = await service.getSeatAvailability('event-1');

    expect(result).toEqual({
      rows: 1,
      columns: 2,
      seats: [
        { id: 'seat-1', rowLabel: 'A', seatNumber: 1, isAvailable: true },
        { id: 'seat-2', rowLabel: 'A', seatNumber: 2, isAvailable: false },
      ],
    });
  });
});
