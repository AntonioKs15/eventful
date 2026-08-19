import { appConfig } from './app.config';
import { authConfig } from './auth.config';
import { catalogConfig } from './catalog.config';
import { stripeConfig } from './stripe.config';

export const configurationFactories = [
  appConfig,
  authConfig,
  catalogConfig,
  stripeConfig,
];

export { appConfig, authConfig, catalogConfig, stripeConfig };
