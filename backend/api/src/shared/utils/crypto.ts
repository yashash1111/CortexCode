import crypto from 'crypto';

function getEncryptionKey(): Buffer {
  const secret = process.env.TOKEN_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('TOKEN_ENCRYPTION_KEY or JWT_SECRET must be configured');
  }
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptToken(stored: string): string {
  if (!stored.startsWith('v1:')) {
    // Legacy base64 fallback for existing rows created before Phase 1 hardening
    return Buffer.from(stored, 'base64').toString('utf8');
  }
  const parts = stored.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted token format');
  }
  const [, ivHex, tagHex, dataHex] = parts;
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function signOAuthState(userId: string): string {
  const key = getEncryptionKey();
  const payload = JSON.stringify({
    userId,
    nonce: crypto.randomBytes(16).toString('hex'),
    iat: Date.now(),
  });
  const encoded = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', key).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyOAuthState(state: string): { userId: string } {
  if (!state || !state.includes('.')) {
    throw new Error('Invalid OAuth state format');
  }
  const [encoded, sig] = state.split('.');
  const key = getEncryptionKey();
  const expectedSig = crypto.createHmac('sha256', key).update(encoded).digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new Error('Invalid OAuth state signature');
  }

  const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  if (!parsed.userId || !parsed.iat || Date.now() - parsed.iat > STATE_TTL_MS) {
    throw new Error('OAuth state expired or malformed');
  }
  return { userId: parsed.userId };
}
