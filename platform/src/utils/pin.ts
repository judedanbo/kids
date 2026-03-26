const ITERATIONS = 100_000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;

/**
 * Hashes a 4-digit PIN using PBKDF2 via SubtleCrypto.
 * Returns a base64 string: `<salt>:<hash>`
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const keyMaterial = await getKeyMaterial(pin);
  const derivedKey = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH,
  );

  const saltB64 = uint8ToBase64(salt);
  const hashB64 = uint8ToBase64(new Uint8Array(derivedKey));
  return `${saltB64}:${hashB64}`;
}

/**
 * Verifies a PIN against a stored hash string.
 */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [saltB64, expectedHashB64] = stored.split(':');
  if (!saltB64 || !expectedHashB64) return false;

  const salt = base64ToUint8(saltB64);
  const keyMaterial = await getKeyMaterial(pin);
  const derivedKey = await globalThis.crypto.subtle.deriveBits(
    // Uint8Array works at runtime in both browser and Node; cast for TS strictness
    { name: 'PBKDF2', salt: salt as unknown as ArrayBuffer, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH,
  );

  const actualHashB64 = uint8ToBase64(new Uint8Array(derivedKey));
  return actualHashB64 === expectedHashB64;
}

async function getKeyMaterial(pin: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return globalThis.crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
