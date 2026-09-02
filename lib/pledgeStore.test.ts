import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import { decryptJson } from "./pledgeCrypto";
import { getPledgeStats, savePledge, type StoredPledge } from "./pledgeStore";

let dir: string;

beforeAll(async () => {
  delete process.env.BLOB_READ_WRITE_TOKEN; // force local fallback
  process.env.PLEDGE_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  dir = await mkdtemp(path.join(tmpdir(), "pledges-"));
  process.env.PLEDGE_LOCAL_DIR = dir;
});

describe("savePledge (local fallback)", () => {
  it("persists an encrypted record and aggregates stats", async () => {
    const { id: id1 } = await savePledge({
      amountChf: 100,
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
      phone: "+41 79 123 45 67",
    });
    const { id: id2 } = await savePledge({
      amountChf: 250,
      firstName: "Alan",
      lastName: "Turing",
      email: "alan@example.com",
      phone: "+41 44 000 00 00",
    });

    const raw = await readFile(path.join(dir, `${id1}.json`), "utf8");

    // Amount + timestamp are in clear; PII must be encrypted.
    expect(raw).toContain('"amountChf":100');
    expect(raw).not.toContain("ada@example.com");
    expect(raw).not.toContain("Lovelace");

    const record = JSON.parse(raw) as StoredPledge;
    const pii = decryptJson<{ email: string; firstName: string }>(record.pii);
    expect(pii.email).toBe("ada@example.com");
    expect(pii.firstName).toBe("Ada");

    const stats = await getPledgeStats();
    expect(stats.backers).toBe(2);
    expect(stats.totalChf).toBe(350);

    expect(id2).not.toBe(id1);
  });
});

describe("getPledgeStats", () => {
  it("returns zeroes when the store is empty/missing", async () => {
    process.env.PLEDGE_LOCAL_DIR = path.join(dir, "does-not-exist");
    const stats = await getPledgeStats();
    expect(stats).toEqual({ backers: 0, totalChf: 0 });
    process.env.PLEDGE_LOCAL_DIR = dir; // restore
  });
});
