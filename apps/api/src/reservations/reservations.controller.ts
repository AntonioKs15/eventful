import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Reservation } from '@prisma/client';
import { UserRole } from '@eventful/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/strategies/jwt-access.strategy';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ReservationsService } from './reservations.service';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Roles(UserRole.CUSTOMER)
  @Post()
  @ApiOperation({
    summary: 'Holds a seat or general-admission quantity for checkout.',
  })
  create(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreateReservationDto,
  ): Promise<Reservation> {
    return this.reservationsService.createReservation(
      user.userId,
      body.eventId,
      {
        seatIds: body.seatIds,
        quantity: body.quantity,
      },
    );
  }

  @Roles(UserRole.CUSTOMER)
  @Get(':id')
  @ApiOperation({
    summary: "Returns one of the authenticated customer's reservations.",
  })
  findOne(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Param('id') id: string,
  ): Promise<Reservation> {
    return this.reservationsService.findOwned(user.userId, id);
  }
}
