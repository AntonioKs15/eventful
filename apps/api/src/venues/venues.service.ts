import { Injectable } from '@nestjs/common';
import { Venue, VenueSource } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';

export interface ManualVenueInput {
  name: string;
  city: string;
  address: string;
}

export interface CatalogVenueInput extends ManualVenueInput {
  externalId: string;
}

@Injectable()
export class VenuesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(VenuesService.name);
  }

  async createManual(input: ManualVenueInput): Promise<Venue> {
    try {
      return await this.prisma.venue.create({
        data: { ...input, source: VenueSource.MANUAL },
      });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to create a manual venue');
      throw error;
    } finally {
      this.logger.debug('Manual venue creation completed');
    }
  }

  async findOrCreateFromCatalog(input: CatalogVenueInput): Promise<Venue> {
    try {
      return await this.prisma.venue.upsert({
        where: {
          source_externalId: {
            source: VenueSource.TICKETMASTER,
            externalId: input.externalId,
          },
        },
        update: {},
        create: {
          name: input.name,
          city: input.city,
          address: input.address,
          externalId: input.externalId,
          source: VenueSource.TICKETMASTER,
        },
      });
    } catch (error) {
      this.logger.error(
        { err: error },
        'Failed to resolve a catalog-sourced venue',
      );
      throw error;
    } finally {
      this.logger.debug('Catalog venue resolution completed');
    }
  }

  async findById(id: string): Promise<Venue | null> {
    try {
      return await this.prisma.venue.findUnique({ where: { id } });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to look up venue by id');
      throw error;
    } finally {
      this.logger.debug('Venue lookup completed');
    }
  }
}
