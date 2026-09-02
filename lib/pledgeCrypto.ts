import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit nonce, recommended for GCM
const KEY_BYTES = 32; // AES-256

export interface EncryptedEnvelope {
  alg: "aes-256-gcm";
  v: 1;
  iv: string; // base64
  tag: string; // base64 auth tag
  data: string; // base64 ciphertext
}

/**
 * Derive a 32-byte AES key from the configured secret. Accepts, in order of
 * preference:
 *   - 64 hex chars (32 bytes)
 *   - base64 that decodes to exactly 32 bytes
 *   - any other passphrase, stretched with scrypt (fixed app salt)
 */
export function deriveKey(secret: string): Buffer {
  if (!secret) throw new Error("Encryption secret is empty");

  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }

  const asBase64 = Buffer.from(secret, "base64");
  if (asBase64.length === KEY_BYTES) {
    return asBase64;
  }

  return scryptSync(secret, "zero-latency::pledge::v1", KEY_BYTES);
}

let cachedKey: Buffer | null = null;

export function loadKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.PLEDGE_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "PLEDGE_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32`.",
    );
  }
  cachedKey = deriveKey(secret);
  return cachedKey;
}

export function encryptJson(value: unknown, key: Buffer = loadKey()): EncryptedEnvelope {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    alg: ALGORITHM,
    v: 1,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: ciphertext.toString("base64"),
  };
}

export function decryptJson<T = unknown>(
  envelope: EncryptedEnvelope,
  key: Buffer = loadKey(),
): T {
  if (envelope.alg !== ALGORITHM) {
    throw new Error(`Unsupported algorithm: ${envelope.alg}`);
  }
  const iv = Buffer.from(envelope.iv, "base64");
  const tag = Buffer.from(envelope.tag, "base64");
  const ciphertext = Buffer.from(envelope.data, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

/** Constant-time comparison helper (used by webhook signature checks, etc.). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
