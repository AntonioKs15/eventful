import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Ticket } from '@prisma/client';
import {
  PaginatedResult,
  PAGINATION_DEFAULTS,
  UserRole,
} from '@eventful/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/strategies/jwt-access.strategy';
import { generateQrCodeDataUrl } from './qr-image.util';
import { QrService } from './qr.service';
import { TicketsService } from './tickets.service';

export interface TicketQrResponse {
  payload: string;
  dataUrl: string;
}

@ApiTags('tickets')
@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly qrService: QrService,
  ) {}

  @Roles(UserRole.CUSTOMER)
  @Get('mine')
  @ApiOperation({ summary: "Lists the authenticated customer's tickets." })
  listMine(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Query('page') page = PAGINATION_DEFAULTS.PAGE,
    @Query('pageSize') pageSize = PAGINATION_DEFAULTS.PAGE_SIZE,
  ): Promise<PaginatedResult<Ticket>> {
    return this.ticketsService.listMine(
      user.userId,
      Number(page),
      Number(pageSize),
    );
  }

  @Public()
  @Get('share/:qrPublicCode')
  @ApiOperation({
    summary: 'Returns the public view of a ticket shared via link.',
  })
  findByPublicCode(
    @Param('qrPublicCode') qrPublicCode: string,
  ): Promise<Ticket> {
    return this.ticketsService.findByPublicCode(qrPublicCode);
  }

  @Roles(UserRole.CUSTOMER)
  @Get(':id/qr')
  @ApiOperation({
    summary: "Returns the ticket's gate-scannable QR payload and image.",
  })
  async getQrCode(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ): Promise<TicketQrResponse> {
    const ticket = await this.ticketsService.findOwned(user.userId, id);
    const payload = this.qrService.buildPayload(ticket.id);
    const dataUrl = await generateQrCodeDataUrl(payload);
    return { payload, dataUrl };
  }

  @Roles(UserRole.CUSTOMER)
  @Get(':id')
  @ApiOperation({
    summary: "Returns one of the authenticated customer's tickets.",
  })
  findOne(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ): Promise<Ticket> {
    return this.ticketsService.findOwned(user.userId, id);
  }
}
