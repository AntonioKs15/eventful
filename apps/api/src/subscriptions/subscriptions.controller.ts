import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Inject,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Subscription } from '@prisma/client';
import type { Request } from 'express';
import Stripe from 'stripe';
import { UserRole } from '@eventful/contracts';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequestUser } from '../auth/strategies/jwt-access.strategy';
import { stripeConfig } from '../config/stripe.config';
import type { StripeConfig } from '../config/stripe.config';
import { PrismaService } from '../prisma/prisma.service';
import { STRIPE_CLIENT } from './stripe-client.provider';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    @Inject(stripeConfig.KEY) private readonly stripeCfg: StripeConfig,
  ) {}

  @Roles(UserRole.CUSTOMER)
  @Get('me')
  @ApiOperation({
    summary:
      "Returns the caller's subscription, or null if they never subscribed.",
  })
  getMine(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<Subscription | null> {
    return this.subscriptionsService.getMine(user.userId);
  }

  @Roles(UserRole.CUSTOMER)
  @Post('checkout-session')
  @ApiOperation({
    summary:
      'Starts a Stripe Checkout session for the monthly subscription plan.',
  })
  async createCheckoutSession(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<{ url: string }> {
    const account = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.userId },
    });
    return this.subscriptionsService.createCheckoutSession(
      user.userId,
      account.email,
    );
  }

  @Roles(UserRole.CUSTOMER)
  @Post('portal-session')
  @ApiOperation({
    summary:
      'Starts a Stripe Billing Portal session to manage or cancel the subscription.',
  })
  createPortalSession(
    @CurrentUser() user: AuthenticatedRequestUser,
  ): Promise<{ url: string }> {
    return this.subscriptionsService.createPortalSession(user.userId);
  }

  @Public()
  @Post('webhook')
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    if (!signature || !req.rawBody) {
      throw new BadRequestException('Missing Stripe webhook signature.');
    }
    if (!this.stripeCfg.webhookSecret) {
      throw new Error(
        'STRIPE_WEBHOOK_SECRET is not set. Add it to apps/api/.env before receiving webhooks.',
      );
    }

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        this.stripeCfg.webhookSecret,
      );
    } catch (error) {
      throw new BadRequestException(
        `Invalid Stripe webhook signature: ${(error as Error).message}`,
      );
    }

    await this.subscriptionsService.handleWebhookEvent(event);
    return { received: true };
  }
}
