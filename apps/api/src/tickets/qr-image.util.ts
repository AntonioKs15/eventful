import * as QRCode from 'qrcode';

export function generateQrCodeDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload);
}
