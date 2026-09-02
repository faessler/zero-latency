import "server-only";

import { articleFromHtml, resolveSourceUrl } from "./parseGoogleDoc";
import { sampleArticle } from "./sampleContent";
import type { Article } from "./types";

const FETCH_TIMEOUT_MS = 8000;

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        // Some Google endpoints behave better with a normal browser UA.
        "User-Agent":
          "Mozilla/5.0 (compatible; ZeroLatencySite/1.0; +https://vercel.com)",
      },
      // Revalidate periodically so doc edits show up without a redeploy.
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Upstream responded ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Load the article. Prefers the Google Doc named by GOOGLE_DOC_URL and falls back
 * to bundled sample content whenever the doc is missing, unreachable, or empty.
 */
export async function getArticle(): Promise<Article> {
  const url = process.env.GOOGLE_DOC_URL?.trim();
  if (!url) return sampleArticle;

  try {
    const html = await fetchHtml(resolveSourceUrl(url));
    const article = articleFromHtml(html);
    if (article.blocks.length === 0) {
      console.warn("[content] Google Doc parsed to zero blocks; using sample content.");
      return sampleArticle;
    }
    return article;
  } catch (err) {
    console.warn(
      `[content] Failed to load Google Doc, falling back to sample content: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    return sampleArticle;
  }
}
