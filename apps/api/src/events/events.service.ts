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

type EventWithVenue = Prisma.EventGetPayload<{ include: { venue: true } }>;

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
  ): Promise<PaginatedResult<EventWithVenue>> {
    const where: Prisma.EventWhereInput = {
      status: EventStatus.PUBLISHED,
      ...(query.city
        ? { venue: { city: { equals: query.city, mode: 'insensitive' } } }
        : {}),
    };

    try {
      const [data, total] = await Promise.all([
        this.prisma.event.findMany({
          where,
          include: { venue: true },
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
  ): Promise<PaginatedResult<EventWithVenue>> {
    const where: Prisma.EventWhereInput = { organizerId };

    try {
      const [data, total] = await Promise.all([
        this.prisma.event.findMany({
          where,
          include: { venue: true },
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

  async findPublishedById(eventId: string): Promise<EventWithVenue> {
    let event: EventWithVenue | null;

    try {
      event = await this.prisma.event.findFirst({
        where: { id: eventId, status: EventStatus.PUBLISHED },
        include: { venue: true },
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
