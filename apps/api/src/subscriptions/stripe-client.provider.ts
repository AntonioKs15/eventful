import { FactoryProvider } from '@nestjs/common';
import Stripe from 'stripe';
import { stripeConfig } from '../config/stripe.config';
import type { StripeConfig } from '../config/stripe.config';

export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');

// A placeholder key when STRIPE_SECRET_KEY is unset lets the app boot (the Stripe SDK's
// constructor requires a truthy key) without ever reaching Stripe's API — every subscription
// entry point checks `stripeConfig.secretKey` itself first and fails with a clear message
// before this client would otherwise be used.
const UNCONFIGURED_KEY_PLACEHOLDER = 'sk_test_not_configured';

export const stripeClientProvider: FactoryProvider<Stripe> = {
  provide: STRIPE_CLIENT,
  inject: [stripeConfig.KEY],
  useFactory: (config: StripeConfig): Stripe =>
    new Stripe(config.secretKey ?? UNCONFIGURED_KEY_PLACEHOLDER),
};
