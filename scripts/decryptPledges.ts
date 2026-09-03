/**
 * Offline pledge decryption tool.
 *
 * Reads pledge records (from Vercel Blob if BLOB_READ_WRITE_TOKEN is set,
 * otherwise from the local ./.data/pledges dir) and decrypts the PII with your
 * X25519 PRIVATE key. This is meant to run ON YOUR MACHINE only — the private
 * key must never be deployed.
 *
 * Usage:
 *   PLEDGE_PRIVATE_KEY_FILE=pledge_private.pem npm run decrypt
 *   npm run decrypt -- --key pledge_private.pem
 *   npm run decrypt -- --key pledge_private.pem --json
 *
 * For Vercel Blob, also export BLOB_READ_WRITE_TOKEN (and BLOB_STORE_ID).
 */
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { open, parsePrivateKey, type SealedEnvelope } from "../lib/pledgeCrypto";

const BLOB_PREFIX = "pledges/";

interface StoredPledge {
  id: string;
  amountChf: number;
  currency: string;
  createdAt: string;
  pii: SealedEnvelope;
}

interface Pii {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  const inline = process.argv.find((a) => a.startsWith(`--${name}=`));
  return inline ? inline.split("=").slice(1).join("=") : undefined;
}

async function loadPrivateKey() {
  const file = getArg("key") || process.env.PLEDGE_PRIVATE_KEY_FILE;
  if (file) return parsePrivateKey(await readFile(file, "utf8"));
  if (process.env.PLEDGE_PRIVATE_KEY) return parsePrivateKey(process.env.PLEDGE_PRIVATE_KEY);
  throw new Error(
    "No private key. Pass --key <file>, or set PLEDGE_PRIVATE_KEY_FILE / PLEDGE_PRIVATE_KEY.",
  );
}

async function readRecords(): Promise<StoredPledge[]> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { list, get } = await import("@vercel/blob");
    const records: StoredPledge[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: BLOB_PREFIX, cursor });
      for (const blob of page.blobs) {
        const result = await get(blob.pathname, { access: "private" });
        if (!result?.stream) continue;
        records.push((await new Response(result.stream).json()) as StoredPledge);
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return records;
  }

  const dir = process.env.PLEDGE_LOCAL_DIR || path.join(process.cwd(), ".data", "pledges");
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const records: StoredPledge[] = [];
  for (const f of files) {
    records.push(JSON.parse(await readFile(path.join(dir, f), "utf8")) as StoredPledge);
  }
  return records;
}

async function main() {
  const asJson = process.argv.includes("--json");
  const privateKey = await loadPrivateKey();
  const records = await readRecords();
  records.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const rows = records.map((rec) => {
    try {
      const pii = open<Pii>(rec.pii, privateKey);
      return {
        date: rec.createdAt,
        amountChf: rec.amountChf,
        name: `${pii.firstName} ${pii.lastName}`,
        email: pii.email,
        phone: pii.phone,
      };
    } catch (err) {
      return {
        date: rec.createdAt,
        amountChf: rec.amountChf,
        name: "<decrypt failed>",
        email: err instanceof Error ? err.message : String(err),
        phone: "",
      };
    }
  });

  if (asJson) {
    console.log(JSON.stringify(rows, null, 2));
  } else if (rows.length === 0) {
    console.log("No pledges found.");
  } else {
    console.table(rows);
    const total = rows.reduce((s, r) => s + (r.amountChf || 0), 0);
    console.log(`\n${rows.length} pledge(s), CHF ${total.toLocaleString("en-US")} total.`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
