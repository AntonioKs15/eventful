import { Module } from '@nestjs/common';
import { QrService } from './qr.service';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, QrService],
  exports: [TicketsService, QrService],
})
export class TicketsModule {}
