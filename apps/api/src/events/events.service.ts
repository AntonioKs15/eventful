import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Event, Prisma, Venue } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import {
  buildPaginationMeta,
  EventLayoutType,
  EventSortBy,
  EventStatus,
  PaginatedResult,
} from '@eventful/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { VenuesService } from '../venues/venues.service';
import { buildEventAllocationData } from './builders/event-allocation-data.builder';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateEventVenueDto } from './dto/create-event-venue.dto';
import { ListEventsQueryDto } from './dto/list-events-query.dto';
import { EventNotFoundException } from './exceptions/event-not-found.exception';
import { VenueNotFoundException } from './exceptions/venue-not-found.exception';

const EVENT_ORDER_BY: Record<
  EventSortBy,
  Prisma.EventOrderByWithRelationInput
> = {
  [EventSortBy.STARTS_AT]: { startsAt: 'asc' },
  [EventSortBy.PRICE_CENTS]: { priceCents: 'asc' },
};

const EVENT_DETAIL_INCLUDE = {
  venue: true,
  movie: true,
  generalAdmissionPool: true,
  seatMap: { select: { rows: true, columns: true } },
} satisfies Prisma.EventInclude;

type EventWithDetails = Prisma.EventGetPayload<{
  include: typeof EVENT_DETAIL_INCLUDE;
}>;

type SeatMapWithHolds = Prisma.SeatMapGetPayload<{
  include: {
    seats: { include: { reservationSeats: { select: { id: true } } } };
  };
}>;

export interface SeatAvailabilityEntry {
  id: string;
  rowLabel: string;
  seatNumber: number;
  isAvailable: boolean;
}

export interface SeatAvailabilityMap {
  rows: number;
  columns: number;
  seats: SeatAvailabilityEntry[];
}

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly venuesService: VenuesService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EventsService.name);
  }

  async createEvent(organizerId: string, dto: CreateEventDto): Promise<Event> {
    this.assertValidAllocationShape(dto);
    const venue = await this.resolveVenue(dto.venue);
    const allocationData = buildEventAllocationData(dto);

    try {
      return await this.prisma.event.create({
        data: {
          title: dto.title,
          description: dto.description,
          startsAt: dto.startsAt,
          capacity: dto.capacity,
          priceCents: dto.priceCents,
          layoutType: dto.layoutType,
          status: EventStatus.DRAFT,
          catalogSourceId: dto.catalogSourceId,
          venue: { connect: { id: venue.id } },
          organizer: { connect: { id: organizerId } },
          movie: dto.movieId ? { connect: { id: dto.movieId } } : undefined,
          ...allocationData,
        },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to create event');
      throw error;
    } finally {
      this.logger.debug('Event creation completed');
    }
  }

  async publish(organizerId: string, eventId: string): Promise<Event> {
    const event = await this.findOwnedEventOrThrow(organizerId, eventId);

    try {
      return await this.prisma.event.update({
        where: { id: event.id },
        data: { status: EventStatus.PUBLISHED },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to publish event');
      throw error;
    } finally {
      this.logger.debug('Event publish completed');
    }
  }

  async listPublished(
    query: ListEventsQueryDto,
  ): Promise<PaginatedResult<EventWithDetails>> {
    const where: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
      ...(query.city
        ? { venue: { city: { equals: query.city, mode: 'insensitive' } } }
        : {}),
      ...(query.movieId ? { movieId: query.movieId } : {}),
    };

    try {
      const [data, total] = await Promise.all([
        this.prisma.event.findMany({
          where,
          include: EVENT_DETAIL_INCLUDE,
          orderBy: EVENT_ORDER_BY[query.sortBy],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.prisma.event.count({ where }),
      ]);

      return {
        data,
        meta: buildPaginationMeta(query.page, query.pageSize, total),
      };
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to list published events');
      throw error;
    } finally {
      this.logger.debug('Published event listing completed');
    }
  }

  async listMine(
    organizerId: string,
    query: Pick<ListEventsQueryDto, 'page' | 'pageSize'>,
  ): Promise<PaginatedResult<EventWithDetails>> {
    const where: Prisma.EventWhereInput = { organizerId };

    try {
      const [data, total] = await Promise.all([
        this.prisma.event.findMany({
          where,
          include: EVENT_DETAIL_INCLUDE,
          orderBy: { createdAt: 'desc' },
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        }),
        this.prisma.event.count({ where }),
      ]);

      return {
        data,
        meta: buildPaginationMeta(query.page, query.pageSize, total),
      };
    } catch (error) {
      this.logger.error({ err: error }, "Failed to list organizer's events");
      throw error;
    } finally {
      this.logger.debug('Organizer event listing completed');
    }
  }

  async findPublishedById(eventId: string): Promise<EventWithDetails> {
    let event: EventWithDetails | null;

    try {
      event = await this.prisma.event.findFirst({
        where: { id: eventId, status: EventStatus.PUBLISHED },
        include: EVENT_DETAIL_INCLUDE,
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to look up published event');
      throw error;
    } finally {
      this.logger.debug('Published event lookup completed');
    }

    if (!event) {
      throw new EventNotFoundException();
    }

    return event;
  }

  async getSeatAvailability(
    eventId: string,
  ): Promise<SeatAvailabilityMap | null> {
    let seatMap: SeatMapWithHolds | null;

    try {
      seatMap = await this.prisma.seatMap.findUnique({
        where: { eventId },
        include: {
          seats: { include: { reservationSeats: { select: { id: true } } } },
        },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to look up seat availability');
      throw error;
    } finally {
      this.logger.debug('Seat availability lookup completed');
    }

    if (!seatMap) {
      return null;
    }

    return {
      rows: seatMap.rows,
      columns: seatMap.columns,
      seats: seatMap.seats.map((seat) => ({
        id: seat.id,
        rowLabel: seat.rowLabel,
        seatNumber: seat.seatNumber,
        isAvailable: seat.reservationSeats.length === 0,
      })),
    };
  }

  private async findOwnedEventOrThrow(
    organizerId: string,
    eventId: string,
  ): Promise<Event> {
    let event: Event | null;

    try {
      event = await this.prisma.event.findUnique({ where: { id: eventId } });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to look up event');
      throw error;
    } finally {
      this.logger.debug('Event lookup completed');
    }

    if (!event) {
      throw new EventNotFoundException();
    }

    if (event.organizerId !== organizerId) {
      throw new ForbiddenException();
    }

    return event;
  }

  private assertValidAllocationShape(dto: CreateEventDto): void {
    const isGeneralAdmissionWithSeatMap =
      dto.layoutType === EventLayoutType.GENERAL_ADMISSION &&
      Boolean(dto.seatMap);
    if (isGeneralAdmissionWithSeatMap) {
      throw new BadRequestException(
        'General admission events cannot include a seat map.',
      );
    }

    const isSeatedWithoutSeatMap =
      dto.layoutType === EventLayoutType.SEATED && !dto.seatMap;
    if (isSeatedWithoutSeatMap) {
      throw new BadRequestException('Seated events require a seat map.');
    }

    const seatMapCapacityMismatches =
      dto.layoutType === EventLayoutType.SEATED &&
      dto.seatMap !== undefined &&
      dto.seatMap.rows * dto.seatMap.columns !== dto.capacity;
    if (seatMapCapacityMismatches) {
      throw new BadRequestException(
        'Event capacity must equal seat map rows times columns.',
      );
    }
  }

  private async resolveVenue(venueDto: CreateEventVenueDto): Promise<Venue> {
    if (venueDto.id) {
      const venue = await this.venuesService.findById(venueDto.id);
      if (!venue) {
        throw new VenueNotFoundException();
      }
      return venue;
    }

    if (venueDto.externalId) {
      return this.venuesService.findOrCreateFromCatalog({
        externalId: venueDto.externalId,
        name: venueDto.name as string,
        city: venueDto.city as string,
        address: venueDto.address as string,
      });
    }

    return this.venuesService.createManual({
      name: venueDto.name as string,
      city: venueDto.city as string,
      address: venueDto.address as string,
    });
  }
}
