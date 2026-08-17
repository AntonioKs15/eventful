import * as argon2 from 'argon2';
import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class PasswordHasherService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(PasswordHasherService.name);
  }

  async hash(plainTextPassword: string): Promise<string> {
    try {
      return await argon2.hash(plainTextPassword);
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to hash password');
      throw error;
    } finally {
      this.logger.debug('Password hash attempt completed');
    }
  }

  async verify(
    passwordHash: string,
    plainTextPassword: string,
  ): Promise<boolean> {
    try {
      return await argon2.verify(passwordHash, plainTextPassword);
    } catch (error) {
      this.logger.warn(
        { err: error },
        'Password verification failed against a malformed hash',
      );
      return false;
    } finally {
      this.logger.debug('Password verify attempt completed');
    }
  }
}
