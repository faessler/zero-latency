import "server-only";

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

import { encryptJson, type EncryptedEnvelope } from "./pledgeCrypto";
import type { PledgeInput } from "./pledge";

const BLOB_PREFIX = "pledges/";

/**
 * What we persist per pledge. PII (name / email / phone) is encrypted; the
 * amount and timestamp are kept in clear so aggregate stats never require
 * decrypting personal data.
 */
export interface StoredPledge {
  v: 1;
  id: string;
  amountChf: number;
  currency: "CHF";
  createdAt: string;
  pii: EncryptedEnvelope;
}

export interface PledgeStats {
  backers: number;
  totalChf: number;
}

function newId(): string {
  return `${Date.now()}-${randomBytes(6).toString("hex")}`;
}

function usesBlob(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function localDir(): string {
  return process.env.PLEDGE_LOCAL_DIR || path.join(process.cwd(), ".data", "pledges");
}

function buildRecord(input: PledgeInput): StoredPledge {
  return {
    v: 1,
    id: newId(),
    amountChf: input.amountChf,
    currency: "CHF",
    createdAt: new Date().toISOString(),
    pii: encryptJson({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
    }),
  };
}

export async function savePledge(input: PledgeInput): Promise<{ id: string }> {
  const record = buildRecord(input);
  const body = JSON.stringify(record);
  const key = `${BLOB_PREFIX}${record.id}.json`;

  if (usesBlob()) {
    const { put } = await import("@vercel/blob");
    await put(key, body, {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,
    });
  } else {
    const dir = localDir();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, `${record.id}.json`), body, "utf8");
  }

  return { id: record.id };
}

function tally(records: Array<Pick<StoredPledge, "amountChf">>): PledgeStats {
  return records.reduce<PledgeStats>(
    (acc, r) => {
      acc.backers += 1;
      acc.totalChf += Number.isFinite(r.amountChf) ? r.amountChf : 0;
      return acc;
    },
    { backers: 0, totalChf: 0 },
  );
}

/**
 * Aggregate backers + total pledged. Reads only the clear-text amount, never the
 * encrypted PII. Degrades gracefully to zeroes if the store is unreachable.
 */
export async function getPledgeStats(): Promise<PledgeStats> {
  try {
    if (usesBlob()) {
      const { list, get } = await import("@vercel/blob");
      const records: Array<Pick<StoredPledge, "amountChf">> = [];
      let cursor: string | undefined;
      do {
        const page = await list({ prefix: BLOB_PREFIX, cursor });
        for (const blob of page.blobs) {
          const result = await get(blob.pathname, { access: "private" });
          if (!result?.stream) continue;
          const rec = (await new Response(result.stream).json()) as StoredPledge;
          records.push({ amountChf: rec.amountChf });
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return tally(records);
    }

    const dir = localDir();
    let files: string[] = [];
    try {
      files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    } catch {
      return { backers: 0, totalChf: 0 };
    }
    const records: Array<Pick<StoredPledge, "amountChf">> = [];
    for (const file of files) {
      try {
        const rec = JSON.parse(await readFile(path.join(dir, file), "utf8")) as StoredPledge;
        records.push({ amountChf: rec.amountChf });
      } catch {
        // skip corrupt entries
      }
    }
    return tally(records);
  } catch (err) {
    console.warn(
      `[pledgeStore] Failed to read stats: ${err instanceof Error ? err.message : String(err)}`,
    );
    return { backers: 0, totalChf: 0 };
  }
}
