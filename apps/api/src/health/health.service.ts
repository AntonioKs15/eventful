import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  database: 'ok' | 'unreachable';
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(HealthService.name);
  }

  async check(): Promise<HealthStatus> {
    let database: HealthStatus['database'] = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      this.logger.error({ err: error }, 'Database health check failed');
      database = 'unreachable';
    } finally {
      this.logger.debug('Database health check completed');
    }

    return {
      status: database === 'ok' ? 'ok' : 'degraded',
      database,
    };
  }
}
