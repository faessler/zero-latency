import {
  createCipheriv,
  createDecipheriv,
  createPrivateKey,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  type KeyObject,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

/**
 * Asymmetric "sealed box" for pledge PII.
 *
 * The deployed app holds only the recipient PUBLIC key (X25519) and can encrypt,
 * but never decrypt. Each record uses a fresh ephemeral X25519 keypair; the
 * ECDH shared secret is run through HKDF-SHA256 to derive a one-time AES-256-GCM
 * key. Only the offline PRIVATE key can reconstruct the shared secret and decrypt.
 *
 *   scheme: X25519 (ECDH) -> HKDF-SHA256 -> AES-256-GCM
 */

const CIPHER = "aes-256-gcm";
const IV_BYTES = 12;
const AES_KEY_BYTES = 32;
const HKDF_INFO = Buffer.from("zero-latency:pledge:v2");

export interface SealedEnvelope {
  v: 2;
  alg: "x25519-hkdf-sha256+aes-256-gcm";
  epk: string; // ephemeral X25519 public key, raw 32 bytes, base64url
  iv: string; // base64
  tag: string; // base64 GCM auth tag
  data: string; // base64 ciphertext
}

/** Extract the raw 32-byte public key from an X25519 KeyObject via its JWK. */
function rawPublic(key: KeyObject): Buffer {
  const jwk = key.export({ format: "jwk" }) as { kty?: string; crv?: string; x?: string };
  if (jwk.kty !== "OKP" || jwk.crv !== "X25519" || !jwk.x) {
    throw new Error("Expected an X25519 public key");
  }
  return Buffer.from(jwk.x, "base64url");
}

function publicFromRaw(raw: Buffer): KeyObject {
  return createPublicKey({
    key: { kty: "OKP", crv: "X25519", x: raw.toString("base64url") },
    format: "jwk",
  });
}

/**
 * Parse a public key from an env/config string. Accepts:
 *   - a PEM SPKI block ("-----BEGIN PUBLIC KEY-----")
 *   - base64 of that PEM (single-line friendly, e.g. `base64 -i key.pem`)
 *   - base64 of the raw 32-byte key
 *   - base64 of the DER SPKI
 */
export function parsePublicKey(secret: string): KeyObject {
  const s = secret.trim();
  if (!s) throw new Error("Public key is empty");
  if (s.includes("BEGIN PUBLIC KEY")) return createPublicKey(s);

  const buf = Buffer.from(s, "base64");
  const asText = buf.toString("utf8");
  if (asText.includes("BEGIN PUBLIC KEY")) return createPublicKey(asText);
  if (buf.length === 32) return publicFromRaw(buf);
  try {
    return createPublicKey({ key: buf, format: "der", type: "spki" });
  } catch {
    throw new Error("Unrecognized PLEDGE_PUBLIC_KEY format");
  }
}

/**
 * Parse a private key (used only by the offline decrypt tool, never the app).
 * Accepts a PKCS#8 PEM block or base64 of that PEM.
 */
export function parsePrivateKey(secret: string): KeyObject {
  const s = secret.trim();
  if (!s) throw new Error("Private key is empty");
  if (s.includes("BEGIN PRIVATE KEY")) return createPrivateKey(s);

  const buf = Buffer.from(s, "base64");
  const asText = buf.toString("utf8");
  if (asText.includes("BEGIN PRIVATE KEY")) return createPrivateKey(asText);
  try {
    return createPrivateKey({ key: buf, format: "der", type: "pkcs8" });
  } catch {
    throw new Error("Unrecognized private key format (expected PKCS#8 PEM)");
  }
}

let cachedPublicKey: KeyObject | null = null;

export function loadPublicKey(): KeyObject {
  if (cachedPublicKey) return cachedPublicKey;
  const secret = process.env.PLEDGE_PUBLIC_KEY;
  if (!secret) {
    throw new Error(
      "PLEDGE_PUBLIC_KEY is not set. Generate a keypair with `openssl genpkey -algorithm X25519` and set the public key.",
    );
  }
  cachedPublicKey = parsePublicKey(secret);
  return cachedPublicKey;
}

/** Encrypt a value to the recipient public key. Cannot be reversed without the private key. */
export function seal(value: unknown, publicKey: KeyObject = loadPublicKey()): SealedEnvelope {
  const ephemeral = generateKeyPairSync("x25519");
  const shared = diffieHellman({ privateKey: ephemeral.privateKey, publicKey });

  const ephRaw = rawPublic(ephemeral.publicKey);
  const recipRaw = rawPublic(publicKey);
  const salt = Buffer.concat([ephRaw, recipRaw]);
  const aesKey = Buffer.from(hkdfSync("sha256", shared, salt, HKDF_INFO, AES_KEY_BYTES));

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(CIPHER, aesKey, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    v: 2,
    alg: "x25519-hkdf-sha256+aes-256-gcm",
    epk: ephRaw.toString("base64url"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: ciphertext.toString("base64"),
  };
}

/** Decrypt a sealed envelope with the recipient private key (offline tool only). */
export function open<T = unknown>(envelope: SealedEnvelope, privateKey: KeyObject): T {
  if (envelope.alg !== "x25519-hkdf-sha256+aes-256-gcm") {
    throw new Error(`Unsupported algorithm: ${envelope.alg}`);
  }
  const ephRaw = Buffer.from(envelope.epk, "base64url");
  const ephemeralPublic = publicFromRaw(ephRaw);
  const shared = diffieHellman({ privateKey, publicKey: ephemeralPublic });

  const recipRaw = rawPublic(createPublicKey(privateKey));
  const salt = Buffer.concat([ephRaw, recipRaw]);
  const aesKey = Buffer.from(hkdfSync("sha256", shared, salt, HKDF_INFO, AES_KEY_BYTES));

  const iv = Buffer.from(envelope.iv, "base64");
  const tag = Buffer.from(envelope.tag, "base64");
  const ciphertext = Buffer.from(envelope.data, "base64");

  const decipher = createDecipheriv(CIPHER, aesKey, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

/** Constant-time string comparison (e.g. for webhook signature checks). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
