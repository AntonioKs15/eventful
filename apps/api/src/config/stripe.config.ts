import { registerAs } from '@nestjs/config';

export interface StripeConfig {
  secretKey: string | undefined;
  webhookSecret: string | undefined;
  priceId: string | undefined;
}

export const stripeConfig = registerAs('stripe', (): StripeConfig => ({
  secretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  priceId: process.env.STRIPE_PRICE_ID,
}));
