import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it } from "vitest";

import { open, parsePrivateKey, parsePublicKey, safeEqual, seal } from "./pledgeCrypto";

function newKeypair() {
  const { publicKey, privateKey } = generateKeyPairSync("x25519");
  return {
    publicKey,
    privateKey,
    publicPem: publicKey.export({ type: "spki", format: "pem" }) as string,
    privatePem: privateKey.export({ type: "pkcs8", format: "pem" }) as string,
  };
}

const secret = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "+41 79 000 00 00",
};

describe("seal / open round trip", () => {
  it("recovers the original object with the private key", () => {
    const { publicKey, privateKey } = newKeypair();
    const env = seal(secret, publicKey);
    expect(open(env, privateKey)).toEqual(secret);
  });

  it("marks the envelope with the X25519 scheme and an ephemeral public key", () => {
    const { publicKey } = newKeypair();
    const env = seal(secret, publicKey);
    expect(env.v).toBe(2);
    expect(env.alg).toBe("x25519-hkdf-sha256+aes-256-gcm");
    expect(env.epk.length).toBeGreaterThan(0);
  });

  it("uses a fresh ephemeral key + IV every time (no reuse)", () => {
    const { publicKey } = newKeypair();
    const a = seal(secret, publicKey);
    const b = seal(secret, publicKey);
    expect(a.epk).not.toBe(b.epk);
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
  });

  it("does not leak plaintext into the ciphertext", () => {
    const { publicKey } = newKeypair();
    const blob = JSON.stringify(seal(secret, publicKey));
    expect(blob).not.toContain("ada@example.com");
    expect(blob).not.toContain("Lovelace");
  });
});

describe("the public key alone cannot decrypt", () => {
  it("cannot be opened with a different private key", () => {
    const a = newKeypair();
    const b = newKeypair();
    const env = seal(secret, a.publicKey);
    expect(() => open(env, b.privateKey)).toThrow();
  });

  it("fails when the ciphertext is tampered with", () => {
    const { publicKey, privateKey } = newKeypair();
    const env = seal(secret, publicKey);
    const tampered = { ...env, data: Buffer.from("nope").toString("base64") };
    expect(() => open(tampered, privateKey)).toThrow();
  });

  it("fails when the ephemeral public key is swapped", () => {
    const { publicKey, privateKey } = newKeypair();
    const other = seal(secret, publicKey);
    const env = { ...seal(secret, publicKey), epk: other.epk };
    expect(() => open(env, privateKey)).toThrow();
  });
});

describe("key parsing", () => {
  it("parses a PEM public key", () => {
    const { publicPem, privateKey } = newKeypair();
    const pub = parsePublicKey(publicPem);
    const env = seal(secret, pub);
    expect(open(env, privateKey)).toEqual(secret);
  });

  it("parses a base64-encoded PEM public key (single-line env friendly)", () => {
    const { publicPem, privateKey } = newKeypair();
    const b64 = Buffer.from(publicPem, "utf8").toString("base64");
    const env = seal(secret, parsePublicKey(b64));
    expect(open(env, privateKey)).toEqual(secret);
  });

  it("parses PEM and base64-PEM private keys", () => {
    const { publicKey, privatePem } = newKeypair();
    const env = seal(secret, publicKey);
    expect(open(env, parsePrivateKey(privatePem))).toEqual(secret);
    const b64 = Buffer.from(privatePem, "utf8").toString("base64");
    expect(open(env, parsePrivateKey(b64))).toEqual(secret);
  });

  it("rejects garbage keys", () => {
    expect(() => parsePublicKey("not-a-key")).toThrow();
    expect(() => parsePublicKey("")).toThrow();
  });
});

describe("safeEqual", () => {
  it("compares strings safely", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
