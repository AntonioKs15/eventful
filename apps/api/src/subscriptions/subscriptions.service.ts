import { Inject, Injectable } from '@nestjs/common';
import { Subscription } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import Stripe from 'stripe';
import { KnownNotificationType, SubscriptionStatus } from '@eventful/contracts';
import { castPrismaEnum } from '../common/utils/prisma-enum.util';
import { appConfig } from '../config/app.config';
import type { AppConfig } from '../config/app.config';
import { stripeConfig } from '../config/stripe.config';
import type { StripeConfig } from '../config/stripe.config';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReservationTransactionClient } from '../reservations/strategies/allocation-strategy.interface';
import { SubscriptionAlreadyActiveException } from './exceptions/subscription-already-active.exception';
import { SubscriptionFreeTicketsExhaustedException } from './exceptions/subscription-free-tickets-exhausted.exception';
import { SubscriptionNotActiveException } from './exceptions/subscription-not-active.exception';
import { SubscriptionNotFoundException } from './exceptions/subscription-not-found.exception';
import { STRIPE_CLIENT } from './stripe-client.provider';

const FREE_TICKETS_PER_CYCLE = 2;

type WebhookHandler = (event: Stripe.Event) => Promise<void>;

function idOf(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) {
    return null;
  }
  return typeof value === 'string' ? value : value.id;
}

@Injectable()
export class SubscriptionsService {
  private readonly webhookHandlers: Partial<Record<string, WebhookHandler>>;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
    @Inject(appConfig.KEY) private readonly app: AppConfig,
    @Inject(stripeConfig.KEY) private readonly stripeCfg: StripeConfig,
    private readonly notificationsService: NotificationsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SubscriptionsService.name);
    this.webhookHandlers = {
      'checkout.session.completed': (event) =>
        this.onCheckoutSessionCompleted(event),
      'invoice.paid': (event) => this.onInvoicePaid(event),
      'invoice.payment_failed': (event) => this.onInvoicePaymentFailed(event),
      'customer.subscription.updated': (event) =>
        this.onSubscriptionUpdated(event),
      'customer.subscription.deleted': (event) =>
        this.onSubscriptionDeleted(event),
    };
  }

  async createCheckoutSession(
    userId: string,
    userEmail: string,
  ): Promise<{ url: string }> {
    this.assertStripeConfigured();

    const existing = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (
      existing &&
      castPrismaEnum<SubscriptionStatus>(existing.status) ===
        SubscriptionStatus.ACTIVE
    ) {
      throw new SubscriptionAlreadyActiveException();
    }

    if (!this.stripeCfg.priceId) {
      throw new Error(
        'STRIPE_PRICE_ID is not set. Add it to apps/api/.env before using subscriptions.',
      );
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: this.stripeCfg.priceId, quantity: 1 }],
      customer_email: userEmail,
      client_reference_id: userId,
      success_url: `${this.app.corsOrigin}/subscription?checkout=success`,
      cancel_url: `${this.app.corsOrigin}/subscription`,
    });

    if (!session.url) {
      throw new Error('Stripe did not return a checkout URL.');
    }

    return { url: session.url };
  }

  async createPortalSession(userId: string): Promise<{ url: string }> {
    this.assertStripeConfigured();

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) {
      throw new SubscriptionNotFoundException();
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${this.app.corsOrigin}/subscription`,
    });

    return { url: session.url };
  }

  async getMine(userId: string): Promise<Subscription | null> {
    try {
      return await this.prisma.subscription.findUnique({ where: { userId } });
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to look up subscription');
      throw error;
    } finally {
      this.logger.debug('Subscription lookup completed');
    }
  }

  async consumeFreeTickets(
    tx: ReservationTransactionClient,
    userId: string,
    quantity: number,
  ): Promise<void> {
    const claimed = await tx.subscription.updateMany({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        freeTicketsRemaining: { gte: quantity },
      },
      data: { freeTicketsRemaining: { decrement: quantity } },
    });

    if (claimed.count === 0) {
      await this.throwConsumeFailureReason(tx, userId);
    }
  }

  private async throwConsumeFailureReason(
    tx: ReservationTransactionClient,
    userId: string,
  ): Promise<never> {
    const subscription = await tx.subscription.findUnique({
      where: { userId },
    });
    if (
      !subscription ||
      castPrismaEnum<SubscriptionStatus>(subscription.status) !==
        SubscriptionStatus.ACTIVE
    ) {
      throw new SubscriptionNotActiveException();
    }
    throw new SubscriptionFreeTicketsExhaustedException();
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    const handler = this.webhookHandlers[event.type];
    if (!handler) {
      this.logger.debug(
        { type: event.type },
        'Ignoring unhandled Stripe webhook event type',
      );
      return;
    }

    try {
      await handler(event);
    } catch (error) {
      this.logger.error(
        { err: error, type: event.type },
        'Failed to process Stripe webhook event',
      );
      throw error;
    } finally {
      this.logger.debug({ type: event.type }, 'Stripe webhook event handled');
    }
  }

  private async onCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const stripeSubscriptionId = idOf(session.subscription);
    const stripeCustomerId = idOf(session.customer);

    if (!userId || !stripeSubscriptionId || !stripeCustomerId) {
      this.logger.warn(
        { sessionId: session.id },
        'Checkout session completed without the fields needed to activate a subscription',
      );
      return;
    }

    const subscription =
      await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    const period = this.currentPeriodOf(subscription);

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId,
        stripeSubscriptionId,
        status: SubscriptionStatus.ACTIVE,
        freeTicketsRemaining: FREE_TICKETS_PER_CYCLE,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
      },
      update: {
        stripeCustomerId,
        stripeSubscriptionId,
        status: SubscriptionStatus.ACTIVE,
        freeTicketsRemaining: FREE_TICKETS_PER_CYCLE,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        cancelAtPeriodEnd: false,
      },
    });
  }

  private async onInvoicePaid(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeSubscriptionId = this.subscriptionIdOf(invoice);
    if (!stripeSubscriptionId) {
      return;
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
    });
    if (!existing) {
      return;
    }

    const subscription =
      await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
    const period = this.currentPeriodOf(subscription);

    await this.prisma.subscription.update({
      where: { stripeSubscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        freeTicketsRemaining: FREE_TICKETS_PER_CYCLE,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
      },
    });

    if (invoice.billing_reason === 'subscription_cycle') {
      await this.notify(
        existing.userId,
        KnownNotificationType.SUBSCRIPTION_RENEWED,
        'Subscription renewed',
        'Your subscription renewed and your 2 free tickets are available again this month.',
      );
    }
  }

  private async onInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
    const invoice = event.data.object as Stripe.Invoice;
    const stripeSubscriptionId = this.subscriptionIdOf(invoice);
    if (!stripeSubscriptionId) {
      return;
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
    });
    if (!existing) {
      return;
    }

    await this.prisma.subscription.update({
      where: { stripeSubscriptionId },
      data: { status: SubscriptionStatus.PAST_DUE },
    });

    await this.notify(
      existing.userId,
      KnownNotificationType.SUBSCRIPTION_PAYMENT_FAILED,
      'Subscription payment failed',
      'We could not process your subscription payment. Please update your payment method.',
    );
  }

  private async onSubscriptionUpdated(event: Stripe.Event): Promise<void> {
    const stripeSubscription = event.data.object as Stripe.Subscription;

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSubscription.id },
      data: {
        status: this.mapStripeStatus(stripeSubscription.status),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
    });
  }

  private async onSubscriptionDeleted(event: Stripe.Event): Promise<void> {
    const stripeSubscription = event.data.object as Stripe.Subscription;

    await this.prisma.subscription.updateMany({
      where: { stripeSubscriptionId: stripeSubscription.id },
      data: { status: SubscriptionStatus.CANCELED },
    });
  }

  private async notify(
    userId: string,
    type: string,
    title: string,
    message: string,
  ): Promise<void> {
    try {
      await this.notificationsService.create({ userId, type, title, message });
    } catch (error) {
      this.logger.warn(
        { err: error },
        'Failed to send subscription notification',
      );
    }
  }

  private assertStripeConfigured(): void {
    if (!this.stripeCfg.secretKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is not set. Add it to apps/api/.env before using subscriptions.',
      );
    }
  }

  private currentPeriodOf(subscription: Stripe.Subscription): {
    start: Date;
    end: Date;
  } {
    const item = subscription.items.data[0];
    return {
      start: new Date(item.current_period_start * 1000),
      end: new Date(item.current_period_end * 1000),
    };
  }

  private subscriptionIdOf(invoice: Stripe.Invoice): string | null {
    const details = invoice.parent?.subscription_details;
    return details ? idOf(details.subscription) : null;
  }

  private mapStripeStatus(
    status: Stripe.Subscription.Status,
  ): SubscriptionStatus {
    switch (status) {
      case 'active':
      case 'trialing':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
      case 'unpaid':
        return SubscriptionStatus.PAST_DUE;
      default:
        return SubscriptionStatus.CANCELED;
    }
  }
}
