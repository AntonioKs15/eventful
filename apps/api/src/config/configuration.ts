import { appConfig } from './app.config';
import { authConfig } from './auth.config';
import { catalogConfig } from './catalog.config';

export const configurationFactories = [appConfig, authConfig, catalogConfig];

export { appConfig, authConfig, catalogConfig };
