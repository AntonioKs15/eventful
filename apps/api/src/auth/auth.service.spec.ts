import { UserRole } from '@eventful/contracts';
import { InvalidCredentialsException } from './exceptions/invalid-credentials.exception';
import { RefreshTokenInvalidException } from './exceptions/refresh-token-invalid.exception';
import { SessionUserNotFoundException } from './exceptions/session-user-not-found.exception';
import { AuthService } from './auth.service';

function createMockLogger() {
  return {
    setContext: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

const fakeUser = {
  id: 'user-1',
  email: 'organizer@eventful.test',
  passwordHash: 'hashed-password',
  name: 'Test Organizer',
  role: UserRole.ORGANIZER,
};

function createService() {
  const prisma = {
    user: { findUnique: jest.fn() },
  };
  const passwordHasher = { verify: jest.fn() };
  const refreshTokenService = { issue: jest.fn(), rotate: jest.fn() };
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('signed.jwt.token'),
  };
  const authConfig = { jwtAccessSecret: 'secret', jwtAccessExpiresIn: '15m' };
  const logger = createMockLogger();

  const service = new AuthService(
    prisma as never,
    passwordHasher as never,
    refreshTokenService as never,
    jwtService as never,
    authConfig as never,
    logger as never,
  );

  return { service, prisma, passwordHasher, refreshTokenService, jwtService };
}

describe('AuthService', () => {
  describe('login', () => {
    it('returns an access token, a refresh token, and the user on matching credentials', async () => {
      const { service, prisma, passwordHasher, refreshTokenService } =
        createService();
      prisma.user.findUnique.mockResolvedValue(fakeUser);
      passwordHasher.verify.mockResolvedValue(true);
      refreshTokenService.issue.mockResolvedValue('raw-refresh-token');

      const session = await service.login(
        'organizer@eventful.test',
        'correct-password',
      );

      expect(session.accessToken).toBe('signed.jwt.token');
      expect(session.refreshToken).toBe('raw-refresh-token');
      expect(session.user).toEqual({
        id: 'user-1',
        email: 'organizer@eventful.test',
        name: 'Test Organizer',
        role: UserRole.ORGANIZER,
      });
    });

    it('rejects with InvalidCredentialsException when the email is unknown', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login('nobody@eventful.test', 'whatever'),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
    });

    it('rejects with InvalidCredentialsException when the password does not match', async () => {
      const { service, prisma, passwordHasher } = createService();
      prisma.user.findUnique.mockResolvedValue(fakeUser);
      passwordHasher.verify.mockResolvedValue(false);

      await expect(
        service.login('organizer@eventful.test', 'wrong-password'),
      ).rejects.toBeInstanceOf(InvalidCredentialsException);
    });
  });

  describe('refresh', () => {
    it('issues a new session for the owner of a valid refresh token', async () => {
      const { service, prisma, refreshTokenService } = createService();
      refreshTokenService.rotate.mockResolvedValue({ userId: 'user-1' });
      refreshTokenService.issue.mockResolvedValue('new-raw-refresh-token');
      prisma.user.findUnique.mockResolvedValue(fakeUser);

      const session = await service.refresh('valid-raw-token');

      expect(session.refreshToken).toBe('new-raw-refresh-token');
      expect(session.user.id).toBe('user-1');
    });

    it('propagates RefreshTokenInvalidException from the token rotation step', async () => {
      const { service, refreshTokenService } = createService();
      refreshTokenService.rotate.mockRejectedValue(
        new RefreshTokenInvalidException(),
      );

      await expect(service.refresh('bad-token')).rejects.toBeInstanceOf(
        RefreshTokenInvalidException,
      );
    });
  });

  describe('getCurrentUser', () => {
    it('returns the public shape of the authenticated user', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(fakeUser);

      const user = await service.getCurrentUser('user-1');

      expect(user).toEqual({
        id: 'user-1',
        email: 'organizer@eventful.test',
        name: 'Test Organizer',
        role: UserRole.ORGANIZER,
      });
    });

    it('throws SessionUserNotFoundException when the JWT points to a deleted user', async () => {
      const { service, prisma } = createService();
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentUser('ghost-user')).rejects.toBeInstanceOf(
        SessionUserNotFoundException,
      );
    });
  });
});
