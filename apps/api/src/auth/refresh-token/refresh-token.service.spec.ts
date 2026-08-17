import { RefreshTokenInvalidException } from '../exceptions/refresh-token-invalid.exception';
import { hashOpaqueToken } from '../security/token-hasher.util';
import { RefreshTokenService } from './refresh-token.service';

function createMockLogger() {
  return {
    setContext: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

function createMockPrisma() {
  return {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };
}

function createService() {
  const prisma = createMockPrisma();
  const logger = createMockLogger();
  const authConfig = { refreshTokenExpiresInDays: 30 };
  const service = new RefreshTokenService(
    prisma as never,
    logger as never,
    authConfig as never,
  );
  return { service, prisma, logger };
}

describe('RefreshTokenService', () => {
  describe('issue', () => {
    it('persists only the hash of the token, never the raw value', async () => {
      const { service, prisma } = createService();
      prisma.refreshToken.create.mockResolvedValue({});

      const rawToken = await service.issue('user-1');

      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      const createArgs = prisma.refreshToken.create.mock.calls[0][0];
      expect(createArgs.data.userId).toBe('user-1');
      expect(createArgs.data.tokenHash).toBe(hashOpaqueToken(rawToken));
      expect(createArgs.data.tokenHash).not.toBe(rawToken);
    });
  });

  describe('rotate', () => {
    it('rejects a token that was never issued', async () => {
      const { service, prisma } = createService();
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.rotate('unknown-token')).rejects.toBeInstanceOf(
        RefreshTokenInvalidException,
      );
    });

    it('rejects an expired token', async () => {
      const { service, prisma } = createService();
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.rotate('expired-token')).rejects.toBeInstanceOf(
        RefreshTokenInvalidException,
      );
    });

    it('treats reuse of an already-rotated token as theft and revokes the whole family', async () => {
      const { service, prisma } = createService();
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000 * 60),
      });

      await expect(service.rotate('reused-token')).rejects.toBeInstanceOf(
        RefreshTokenInvalidException,
      );
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('revokes the presented token and returns its owner for a valid rotation', async () => {
      const { service, prisma } = createService();
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60),
      });

      const result = await service.rotate('valid-token');

      expect(result).toEqual({ userId: 'user-1' });
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('revoke', () => {
    it('revokes an active token by hash without treating it as theft', async () => {
      const { service, prisma } = createService();
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-1',
        userId: 'user-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000 * 60),
      });

      await service.revoke('valid-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
    });

    it('is a no-op when the token is unknown or already revoked', async () => {
      const { service, prisma } = createService();
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.revoke('unknown-token')).resolves.toBeUndefined();
      expect(prisma.refreshToken.update).not.toHaveBeenCalled();
    });
  });
});
