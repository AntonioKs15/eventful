import { Inject, Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { PinoLogger } from 'nestjs-pino';
import { User as PrismaUser } from '@prisma/client';
import { UserRole } from '@eventful/contracts';
import { authConfig } from '../config/auth.config';
import type { AuthConfig } from '../config/auth.config';
import { castPrismaEnum } from '../common/utils/prisma-enum.util';
import { PrismaService } from '../prisma/prisma.service';
import { InvalidCredentialsException } from './exceptions/invalid-credentials.exception';
import { RefreshTokenInvalidException } from './exceptions/refresh-token-invalid.exception';
import { SessionUserNotFoundException } from './exceptions/session-user-not-found.exception';
import { RefreshTokenService } from './refresh-token/refresh-token.service';
import { PasswordHasherService } from './security/password-hasher.service';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}

interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY) private readonly config: AuthConfig,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async login(email: string, password: string): Promise<AuthSession> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const passwordMatches = await this.passwordHasher.verify(
      user.passwordHash,
      password,
    );
    if (!passwordMatches) {
      throw new InvalidCredentialsException();
    }

    return this.issueSession(user);
  }

  async refresh(rawRefreshToken: string): Promise<AuthSession> {
    const { userId } = await this.refreshTokenService.rotate(rawRefreshToken);
    const user = await this.findUserById(userId);
    if (!user) {
      throw new RefreshTokenInvalidException();
    }

    return this.issueSession(user);
  }

  async getCurrentUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new SessionUserNotFoundException();
    }

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  private async issueSession(user: UserRecord): Promise<AuthSession> {
    const signOptions: JwtSignOptions = {
      secret: this.config.jwtAccessSecret,
      expiresIn: this.config.jwtAccessExpiresIn as JwtSignOptions['expiresIn'],
    };
    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, role: user.role },
      signOptions,
    );
    const refreshToken = await this.refreshTokenService.issue(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  private async findUserByEmail(email: string): Promise<UserRecord | null> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      return user ? toUserRecord(user) : null;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to look up user by email');
      throw error;
    } finally {
      this.logger.debug('User lookup by email completed');
    }
  }

  private async findUserById(id: string): Promise<UserRecord | null> {
    try {
      const user = await this.prisma.user.findUnique({ where: { id } });
      return user ? toUserRecord(user) : null;
    } catch (error) {
      this.logger.error({ err: error }, 'Failed to look up user by id');
      throw error;
    } finally {
      this.logger.debug('User lookup by id completed');
    }
  }
}

function toUserRecord(user: PrismaUser): UserRecord {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    name: user.name,
    role: castPrismaEnum<UserRole>(user.role),
  };
}
