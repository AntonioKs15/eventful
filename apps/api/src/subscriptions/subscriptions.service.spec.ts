import { SubscriptionStatus } from '@eventful/contracts';
import { SubscriptionAlreadyActiveException } from './exceptions/subscription-already-active.exception';
import { SubscriptionFreeTicketsExhaustedException } from './exceptions/subscription-free-tickets-exhausted.exception';
import { SubscriptionNotActiveException } from './exceptions/subscription-not-active.exception';
import { SubscriptionNotFoundException } from './exceptions/subscription-not-found.exception';
import { SubscriptionsService } from './subscriptions.service';

function createMockLogger() {
  return {
    setContext: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

function createService() {
  const prisma = {
    subscription: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const stripe = {
    checkout: { sessions: { create: jest.fn() } },
    billingPortal: { sessions: { create: jest.fn() } },
    subscriptions: { retrieve: jest.fn() },
  };
  const app = { corsOrigin: 'http://localhost:3000' };
  const stripeCfg = {
    secretKey: 'sk_test_x',
    webhookSecret: 'whsec_x',
    priceId: 'price_x',
  };
  const notificationsService = { create: jest.fn() };

  const service = new SubscriptionsService(
    prisma as never,
    stripe as never,
    app as never,
    stripeCfg,
    notificationsService as never,
    createMockLogger() as never,
  );

  return { service, prisma, stripe, stripeCfg, notificationsService };
}

const activeSubscription = {
  userId: 'user-1',
  stripeCustomerId: 'cus_1',
  stripeSubscriptionId: 'sub_1',
  status: SubscriptionStatus.ACTIVE,
  freeTicketsRemaining: 2,
};

describe('SubscriptionsService.createCheckoutSession', () => {
  it('throws SubscriptionAlreadyActiveException when the caller already has an active subscription', async () => {
    const { service, prisma } = createService();
    prisma.subscription.findUnique.mockResolvedValue(activeSubscription);

    await expect(
      service.createCheckoutSession('user-1', 'user@example.com'),
    ).rejects.toBeInstanceOf(SubscriptionAlreadyActiveException);
  });

  it('creates a Stripe Checkout session tied to the caller and returns its url', async () => {
    const { service, prisma, stripe } = createService();
    prisma.subscription.findUnique.mockResolvedValue(null);
    stripe.checkout.sessions.create.mockResolvedValue({
      url: 'https://checkout.stripe.com/session-1',
    });

    const result = await service.createCheckoutSession(
      'user-1',
      'user@example.com',
    );

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        client_reference_id: 'user-1',
        customer_email: 'user@example.com',
      }),
    );
    expect(result).toEqual({ url: 'https://checkout.stripe.com/session-1' });
  });
});

describe('SubscriptionsService.createPortalSession', () => {
  it('throws SubscriptionNotFoundException when the caller never subscribed', async () => {
    const { service, prisma } = createService();
    prisma.subscription.findUnique.mockResolvedValue(null);

    await expect(service.createPortalSession('user-1')).rejects.toBeInstanceOf(
      SubscriptionNotFoundException,
    );
  });

  it('creates a Billing Portal session for the stored Stripe customer', async () => {
    const { service, prisma, stripe } = createService();
    prisma.subscription.findUnique.mockResolvedValue(activeSubscription);
    stripe.billingPortal.sessions.create.mockResolvedValue({
      url: 'https://billing.stripe.com/portal-1',
    });

    const result = await service.createPortalSession('user-1');

    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_1' }),
    );
    expect(result).toEqual({ url: 'https://billing.stripe.com/portal-1' });
  });
});

describe('SubscriptionsService.consumeFreeTickets', () => {
  it('decrements the free-ticket balance atomically', async () => {
    const { service } = createService();
    const tx = {
      subscription: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    await service.consumeFreeTickets(tx as never, 'user-1', 2);

    expect(tx.subscription.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        status: SubscriptionStatus.ACTIVE,
        freeTicketsRemaining: { gte: 2 },
      },
      data: { freeTicketsRemaining: { decrement: 2 } },
    });
  });

  it('throws SubscriptionNotActiveException when the caller has no active subscription', async () => {
    const { service } = createService();
    const tx = {
      subscription: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    await expect(
      service.consumeFreeTickets(tx as never, 'user-1', 1),
    ).rejects.toBeInstanceOf(SubscriptionNotActiveException);
  });

  it('throws SubscriptionFreeTicketsExhaustedException when active but the balance is insufficient', async () => {
    const { service } = createService();
    const tx = {
      subscription: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue({
          ...activeSubscription,
          freeTicketsRemaining: 1,
        }),
      },
    };

    await expect(
      service.consumeFreeTickets(tx as never, 'user-1', 2),
    ).rejects.toBeInstanceOf(SubscriptionFreeTicketsExhaustedException);
  });
});

describe('SubscriptionsService.handleWebhookEvent', () => {
  it('activates the subscription on checkout.session.completed', async () => {
    const { service, prisma, stripe } = createService();
    stripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_1',
      items: {
        data: [
          {
            current_period_start: 1_700_000_000,
            current_period_end: 1_702_600_000,
          },
        ],
      },
    });
    prisma.subscription.upsert.mockResolvedValue({});

    await service.handleWebhookEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          client_reference_id: 'user-1',
          subscription: 'sub_1',
          customer: 'cus_1',
        },
      },
    } as never);

    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: expect.objectContaining({
          userId: 'user-1',
          stripeCustomerId: 'cus_1',
          stripeSubscriptionId: 'sub_1',
          status: SubscriptionStatus.ACTIVE,
          freeTicketsRemaining: 2,
        }),
      }),
    );
  });

  it('resets the free-ticket balance and notifies on a subscription_cycle invoice.paid', async () => {
    const { service, prisma, stripe, notificationsService } = createService();
    prisma.subscription.findUnique.mockResolvedValue(activeSubscription);
    stripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_1',
      items: {
        data: [
          {
            current_period_start: 1_700_000_000,
            current_period_end: 1_702_600_000,
          },
        ],
      },
    });
    prisma.subscription.update.mockResolvedValue({});

    await service.handleWebhookEvent({
      type: 'invoice.paid',
      data: {
        object: {
          billing_reason: 'subscription_cycle',
          parent: {
            subscription_details: { subscription: 'sub_1' },
          },
        },
      },
    } as never);

    expect(prisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { stripeSubscriptionId: 'sub_1' },
        data: expect.objectContaining({
          status: SubscriptionStatus.ACTIVE,
          freeTicketsRemaining: 2,
        }),
      }),
    );
    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('marks the subscription PAST_DUE and notifies on invoice.payment_failed', async () => {
    const { service, prisma, notificationsService } = createService();
    prisma.subscription.findUnique.mockResolvedValue(activeSubscription);
    prisma.subscription.update.mockResolvedValue({});

    await service.handleWebhookEvent({
      type: 'invoice.payment_failed',
      data: {
        object: {
          parent: { subscription_details: { subscription: 'sub_1' } },
        },
      },
    } as never);

    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: 'sub_1' },
      data: { status: SubscriptionStatus.PAST_DUE },
    });
    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('syncs status and cancelAtPeriodEnd on customer.subscription.updated', async () => {
    const { service, prisma } = createService();
    prisma.subscription.updateMany.mockResolvedValue({ count: 1 });

    await service.handleWebhookEvent({
      type: 'customer.subscription.updated',
      data: {
        object: { id: 'sub_1', status: 'past_due', cancel_at_period_end: true },
      },
    } as never);

    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: 'sub_1' },
      data: { status: SubscriptionStatus.PAST_DUE, cancelAtPeriodEnd: true },
    });
  });

  it('marks the subscription CANCELED on customer.subscription.deleted', async () => {
    const { service, prisma } = createService();
    prisma.subscription.updateMany.mockResolvedValue({ count: 1 });

    await service.handleWebhookEvent({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_1' } },
    } as never);

    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: 'sub_1' },
      data: { status: SubscriptionStatus.CANCELED },
    });
  });

  it('ignores webhook event types it does not handle', async () => {
    const { service, prisma } = createService();

    await service.handleWebhookEvent({
      type: 'payment_intent.created',
      data: { object: {} },
    } as never);

    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(prisma.subscription.update).not.toHaveBeenCalled();
    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
  });
});
