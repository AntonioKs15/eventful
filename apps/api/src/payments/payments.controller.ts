import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@eventful/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/strategies/jwt-access.strategy';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { RedeemFreeTicketDto } from './dto/redeem-free-ticket.dto';
import { PaymentResult, PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles(UserRole.CUSTOMER)
  @Post()
  @ApiOperation({
    summary:
      'Simulates a payment for a reservation: APPROVE issues tickets, DECLINE releases the hold.',
  })
  pay(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: CreatePaymentDto,
  ): Promise<PaymentResult> {
    return this.paymentsService.pay(
      user.userId,
      body.reservationId,
      body.outcome,
    );
  }

  @Roles(UserRole.CUSTOMER)
  @Post('redeem-with-subscription')
  @ApiOperation({
    summary:
      "Settles a reservation using the customer's monthly subscription free-ticket allowance instead of paying.",
  })
  redeemWithSubscription(
    @CurrentUser() user: AuthenticatedRequestUser,
    @Body() body: RedeemFreeTicketDto,
  ): Promise<PaymentResult> {
    return this.paymentsService.redeemWithSubscription(
      user.userId,
      body.reservationId,
    );
  }
}
