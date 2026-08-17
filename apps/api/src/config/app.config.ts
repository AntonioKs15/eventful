import { registerAs } from '@nestjs/config';
import { NodeEnvironment } from './node-environment.enum';

export interface AppConfig {
  nodeEnv: NodeEnvironment;
  port: number;
  corsOrigin: string;
}

export const appConfig = registerAs('app', (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV as NodeEnvironment,
  port: Number(process.env.PORT),
  corsOrigin: process.env.CORS_ORIGIN as string,
}));
