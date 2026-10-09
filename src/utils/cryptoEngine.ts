/**
 * Client-Side Military-Grade Encryption Engine (Web Crypto API)
 * AES-GCM-256 + PBKDF2-SHA256 (100,000 Iterations)
 */

export interface EncryptedContainer {
  iv: string; // Base64 (12 bytes)
  salt: string; // Base64 (16 bytes)
  mimeType: string;
  originalSize: number;
  sha256: string;
  data: string; // Base64 Encrypted Ciphertext
}

const PBKDF2_ITERATIONS = 100000;
const AUTH_PROBE_PHRASE = 'TAVERN_VAULT_PASS_VERIFICATION_PROBE_OK';

/**
 * Derive AES-GCM 256 Key from master password + salt using PBKDF2
 */
export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Calculate SHA-256 hash of an ArrayBuffer
 */
export async function calculateSha256(buffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Helper: ArrayBuffer to Base64
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Helper: Base64 to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Encrypt a raw ArrayBuffer or string into an EncryptedContainer
 */
export async function encryptPayload(
  payload: ArrayBuffer | Uint8Array | string,
  password: string,
  mimeType: string = 'application/json'
): Promise<EncryptedContainer> {
  let rawBuffer: ArrayBuffer;
  if (typeof payload === 'string') {
    rawBuffer = new TextEncoder().encode(payload).buffer;
  } else if (payload instanceof Uint8Array) {
    rawBuffer = payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength) as ArrayBuffer;
  } else {
    rawBuffer = payload;
  }

  const sha256 = await calculateSha256(rawBuffer);
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    rawBuffer
  );

  return {
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
    mimeType,
    originalSize: rawBuffer.byteLength,
    sha256,
    data: bufferToBase64(encryptedBuffer),
  };
}

/**
 * Decrypt an EncryptedContainer back to raw ArrayBuffer with checksum verification
 */
export async function decryptPayload(
  container: EncryptedContainer,
  password: string
): Promise<{ buffer: ArrayBuffer; mimeType: string; sha256: string }> {
  const salt = base64ToUint8Array(container.salt);
  const iv = base64ToUint8Array(container.iv);
  const encryptedBytes = base64ToUint8Array(container.data);
  const key = await deriveKey(password, salt);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      encryptedBytes as BufferSource
    );

    const actualSha256 = await calculateSha256(decryptedBuffer);
    if (container.sha256 && actualSha256 !== container.sha256) {
      throw new Error(`Data checksum mismatch! Expected ${container.sha256}, got ${actualSha256}`);
    }

    return {
      buffer: decryptedBuffer,
      mimeType: container.mimeType,
      sha256: actualSha256,
    };
  } catch (err: any) {
    if (err.name === 'OperationError' || String(err).includes('tag')) {
      throw new Error('解密密码错误或文件密文损坏，无法解密');
    }
    throw err;
  }
}

/**
 * Generate password verification probe tag for fast password testing
 */
export async function generateAuthVerificationTag(password: string): Promise<string> {
  const container = await encryptPayload(AUTH_PROBE_PHRASE, password, 'text/plain');
  return JSON.stringify(container);
}

/**
 * Test if the given password is valid against an auth verification tag
 */
export async function verifyPassword(password: string, authTag: string): Promise<boolean> {
  try {
    const container: EncryptedContainer = JSON.parse(authTag);
    const { buffer } = await decryptPayload(container, password);
    const text = new TextDecoder().decode(buffer);
    return text === AUTH_PROBE_PHRASE;
  } catch {
    return false;
  }
}

const DEVICE_KEY_STORAGE_KEY = 'tavern_vault_device_auto_encryption_seed';

/**
 * Retrieve or generate a 256-bit cryptographically secure local device master key
 * Ensures that even if the user chooses "不使用密码", all files are 100% AES-GCM encrypted before upload
 */
export function getOrCreateDeviceEncryptionKey(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY_STORAGE_KEY);
    if (existing && existing.length >= 32) {
      return existing;
    }
  } catch {}

  const randomBytes = window.crypto.getRandomValues(new Uint8Array(32));
  const hexKey = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  try {
    localStorage.setItem(DEVICE_KEY_STORAGE_KEY, hexKey);
  } catch {}

  return hexKey;
}

/**
 * Export the current device master key for cross-device migration
 */
export function exportDeviceEncryptionKey(): string {
  return getOrCreateDeviceEncryptionKey();
}

/**
 * Import an existing device master key to restore encrypted data without setting a custom password
 */
export function importDeviceEncryptionKey(keyString: string): boolean {
  const cleanKey = keyString.trim();
  if (!cleanKey || cleanKey.length < 16) {
    return false;
  }
  try {
    localStorage.setItem(DEVICE_KEY_STORAGE_KEY, cleanKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reset / Regenerate device master key
 */
export function regenerateDeviceEncryptionKey(): string {
  const randomBytes = window.crypto.getRandomValues(new Uint8Array(32));
  const hexKey = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  try {
    localStorage.setItem(DEVICE_KEY_STORAGE_KEY, hexKey);
  } catch {}
  return hexKey;
}

/**
 * Calculate effective encryption key based on user selection:
 * - If mode is 'custom_password' and password is provided -> returns custom password
 * - If mode is 'device_auto' OR no custom password is provided -> returns 256-bit device master key
 * Guarantees that ALL files uploaded to cloud storage are ALWAYS 100% AES-GCM-256 encrypted
 */
export function getEffectiveEncryptionKey(config: { encryptionMode?: string; encryptionPassword?: string }): string {
  if (config.encryptionMode === 'custom_password' && config.encryptionPassword && config.encryptionPassword.trim().length > 0) {
    return config.encryptionPassword.trim();
  }
  return getOrCreateDeviceEncryptionKey();
}

