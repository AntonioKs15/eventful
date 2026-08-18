import { QrService } from './qr.service';

function createService(secret = 'a'.repeat(32)) {
  return new QrService({ qrHmacSecret: secret } as never);
}

describe('QrService', () => {
  describe('sign/verify', () => {
    it('verifies a signature it produced for the same ticketId', () => {
      const service = createService();
      const signature = service.sign('ticket-1');

      expect(service.verify('ticket-1', signature)).toBe(true);
    });

    it('rejects a signature produced for a different ticketId', () => {
      const service = createService();
      const signature = service.sign('ticket-1');

      expect(service.verify('ticket-2', signature)).toBe(false);
    });

    it('rejects a tampered signature of the same length', () => {
      const service = createService();
      const signature = service.sign('ticket-1');
      const tampered =
        signature.slice(0, -1) + (signature.endsWith('a') ? 'b' : 'a');

      expect(service.verify('ticket-1', tampered)).toBe(false);
    });

    it('rejects a signature with the wrong length instead of throwing', () => {
      const service = createService();

      expect(() => service.verify('ticket-1', 'too-short')).not.toThrow();
      expect(service.verify('ticket-1', 'too-short')).toBe(false);
    });

    it('produces different signatures under different secrets for the same ticketId', () => {
      const serviceA = createService('a'.repeat(32));
      const serviceB = createService('b'.repeat(32));

      expect(serviceA.sign('ticket-1')).not.toBe(serviceB.sign('ticket-1'));
    });
  });

  describe('buildPayload/parsePayload', () => {
    it('round-trips a ticketId through the payload and back', () => {
      const service = createService();
      const payload = service.buildPayload('ticket-1');
      const parsed = service.parsePayload(payload);

      expect(parsed).not.toBeNull();
      expect(parsed?.ticketId).toBe('ticket-1');
      expect(service.verify(parsed!.ticketId, parsed!.signature)).toBe(true);
    });

    it('returns null for a malformed payload', () => {
      const service = createService();

      expect(service.parsePayload('not-a-valid-payload')).toBeNull();
    });
  });
});
