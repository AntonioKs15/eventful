import { PasswordHasherService } from './password-hasher.service';

function createMockLogger() {
  return {
    setContext: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as unknown as ConstructorParameters<typeof PasswordHasherService>[0];
}

describe('PasswordHasherService', () => {
  const service = new PasswordHasherService(createMockLogger());

  it('hashes a password into a value different from the original', async () => {
    const hash = await service.hash('correct-horse-battery-staple');

    expect(hash).not.toBe('correct-horse-battery-staple');
    expect(hash.length).toBeGreaterThan(0);
  });

  it('verifies a matching plain-text password against its hash', async () => {
    const hash = await service.hash('correct-horse-battery-staple');

    await expect(
      service.verify(hash, 'correct-horse-battery-staple'),
    ).resolves.toBe(true);
  });

  it('rejects a non-matching plain-text password', async () => {
    const hash = await service.hash('correct-horse-battery-staple');

    await expect(service.verify(hash, 'wrong-password')).resolves.toBe(false);
  });

  it('rejects verification against a malformed hash instead of throwing', async () => {
    await expect(service.verify('not-a-real-hash', 'anything')).resolves.toBe(
      false,
    );
  });
});
