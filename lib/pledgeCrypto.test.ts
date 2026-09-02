import { randomBytes } from "node:crypto";

import { describe, expect, it } from "vitest";

import { decryptJson, deriveKey, encryptJson, safeEqual } from "./pledgeCrypto";

const key = randomBytes(32);

describe("deriveKey", () => {
  it("accepts a 64-char hex key", () => {
    const hex = randomBytes(32).toString("hex");
    expect(deriveKey(hex).length).toBe(32);
  });

  it("accepts a base64 32-byte key", () => {
    const b64 = randomBytes(32).toString("base64");
    expect(deriveKey(b64).length).toBe(32);
  });

  it("stretches an arbitrary passphrase to 32 bytes", () => {
    expect(deriveKey("correct horse battery staple").length).toBe(32);
  });

  it("is deterministic for the same passphrase", () => {
    expect(deriveKey("hunter2").equals(deriveKey("hunter2"))).toBe(true);
  });

  it("throws on empty secret", () => {
    expect(() => deriveKey("")).toThrow();
  });
});

describe("encrypt / decrypt round trip", () => {
  const secret = { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", phone: "+41 79 000 00 00" };

  it("recovers the original object", () => {
    const env = encryptJson(secret, key);
    expect(decryptJson(env, key)).toEqual(secret);
  });

  it("produces base64 fields and the gcm algorithm marker", () => {
    const env = encryptJson(secret, key);
    expect(env.alg).toBe("aes-256-gcm");
    expect(env.iv.length).toBeGreaterThan(0);
    expect(env.tag.length).toBeGreaterThan(0);
  });

  it("does not leak plaintext into the ciphertext", () => {
    const env = encryptJson(secret, key);
    const blob = JSON.stringify(env);
    expect(blob).not.toContain("ada@example.com");
    expect(blob).not.toContain("Lovelace");
  });

  it("uses a fresh IV each time", () => {
    const a = encryptJson(secret, key);
    const b = encryptJson(secret, key);
    expect(a.iv).not.toBe(b.iv);
    expect(a.data).not.toBe(b.data);
  });

  it("fails to decrypt with the wrong key", () => {
    const env = encryptJson(secret, key);
    expect(() => decryptJson(env, randomBytes(32))).toThrow();
  });

  it("fails when the ciphertext is tampered with (auth tag)", () => {
    const env = encryptJson(secret, key);
    const tampered = { ...env, data: Buffer.from("nope").toString("base64") };
    expect(() => decryptJson(tampered, key)).toThrow();
  });
});

describe("safeEqual", () => {
  it("returns true for equal strings and false otherwise", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
