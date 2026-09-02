import * as cheerio from "cheerio";
import type { AnyNode, Element } from "domhandler";

import type { Article, Block } from "./types";

const IMAGE_PROXY_HOSTS = ["googleusercontent.com", "ggpht.com"];

/**
 * Extract the Google Doc id from any of the common URL shapes:
 *   /document/d/<id>/edit
 *   /document/d/e/<published-id>/pub
 */
export function extractDocId(url: string): string | null {
  const published = url.match(/\/document\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (published) return published[1];
  const normal = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  if (normal) return normal[1];
  return null;
}

/**
 * Resolve the URL we should actually fetch HTML from.
 * - Published docs (/d/e/<id>/pub) are already HTML; fetch as-is.
 * - Regular docs are fetched through the HTML export endpoint.
 * - Anything else (e.g. a direct HTML URL, useful for local testing) is fetched verbatim.
 */
export function resolveSourceUrl(url: string): string {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return url;
  }

  if (!host.endsWith("docs.google.com")) return url;
  if (/\/document\/d\/e\/[a-zA-Z0-9_-]+/.test(url)) return url;

  const id = extractDocId(url);
  if (!id) return url;
  return `https://docs.google.com/document/d/${id}/export?format=html`;
}

function shouldProxy(src: string): boolean {
  try {
    const host = new URL(src).hostname;
    return IMAGE_PROXY_HOSTS.some(
      (h) => host === h || host.endsWith(`.${h}`),
    );
  } catch {
    return false;
  }
}

function normalizeImageSrc(src: string): string {
  if (shouldProxy(src)) {
    return `/api/image?src=${encodeURIComponent(src)}`;
  }
  return src;
}

/**
 * Google Docs HTML export encodes formatting as span classes whose styles live in a
 * <style> block (e.g. `.c3{font-weight:700}`). Build a lookup of which classes are
 * bold / italic so we can re-emit clean semantic markup.
 */
function buildStyleMap($: cheerio.CheerioAPI): Map<string, { bold: boolean; italic: boolean }> {
  const map = new Map<string, { bold: boolean; italic: boolean }>();
  const css = $("style").text();
  const ruleRe = /\.([a-zA-Z0-9_-]+)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = ruleRe.exec(css)) !== null) {
    const [, cls, body] = match;
    const bold = /font-weight:\s*(bold|[6-9]00)/.test(body);
    const italic = /font-style:\s*italic/.test(body);
    if (bold || italic) map.set(cls, { bold, italic });
  }
  return map;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Convert an inline node's children into sanitized HTML (text, links, bold, italic). */
function inlineHtml(
  $: cheerio.CheerioAPI,
  node: AnyNode,
  styleMap: Map<string, { bold: boolean; italic: boolean }>,
): string {
  const parts: string[] = [];

  $(node)
    .contents()
    .each((_i, child) => {
      if (child.type === "text") {
        parts.push(escapeHtml(child.data ?? ""));
        return;
      }
      if (child.type !== "tag") return;
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      if (tag === "br") {
        parts.push("<br />");
        return;
      }

      const inner = inlineHtml($, el, styleMap);
      if (inner.trim() === "") return;

      if (tag === "a") {
        const href = cleanHref($(el).attr("href") ?? "");
        if (href) {
          parts.push(
            `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${inner}</a>`,
          );
        } else {
          parts.push(inner);
        }
        return;
      }

      let out = inner;
      const classes = (el.attribs?.class ?? "").split(/\s+/);
      const style = classes.reduce(
        (acc, c) => {
          const s = styleMap.get(c);
          if (s?.bold) acc.bold = true;
          if (s?.italic) acc.italic = true;
          return acc;
        },
        { bold: false, italic: false },
      );

      const inlineStyle = el.attribs?.style ?? "";
      if (tag === "b" || tag === "strong" || /font-weight:\s*(bold|[6-9]00)/.test(inlineStyle)) {
        style.bold = true;
      }
      if (tag === "i" || tag === "em" || /font-style:\s*italic/.test(inlineStyle)) {
        style.italic = true;
      }

      if (style.italic) out = `<em>${out}</em>`;
      if (style.bold) out = `<strong>${out}</strong>`;
      parts.push(out);
    });

  return parts.join("");
}

/** Google wraps external links in a redirect: https://www.google.com/url?q=<real>&... */
function cleanHref(href: string): string {
  if (!href) return "";
  try {
    const u = new URL(href, "https://docs.google.com");
    if (u.hostname.endsWith("google.com") && u.pathname === "/url") {
      const real = u.searchParams.get("q");
      if (real) return real;
    }
    return u.href;
  } catch {
    return href;
  }
}

function findImage($: cheerio.CheerioAPI, el: Element): Block | null {
  const img = $(el).find("img").first();
  if (img.length === 0) return null;
  const src = img.attr("src");
  if (!src) return null;
  return {
    type: "image",
    src: normalizeImageSrc(src),
    alt: img.attr("alt") ?? "",
  };
}

export function parseGoogleDocHtml(html: string): { title: string; blocks: Block[] } {
  const $ = cheerio.load(html);
  const styleMap = buildStyleMap($);
  const blocks: Block[] = [];

  // cheerio.load normalizes fragments into a full document, so <body> always exists.
  const body = $("body");
  const divs = body.children("div");
  // Google exports wrap everything in a single container div; descend into it.
  const container = divs.length === 1 ? divs.first() : body;

  container.children().each((_i, node) => {
    if (node.type !== "tag") return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
      const html = inlineHtml($, el, styleMap);
      if (html.trim() === "") return;
      const level = Math.min(3, parseInt(tag[1], 10)) as 1 | 2 | 3;
      blocks.push({ type: "heading", level, html });
      return;
    }

    if (tag === "p") {
      const image = findImage($, el);
      if (image) {
        blocks.push(image);
        return;
      }
      const html = inlineHtml($, el, styleMap);
      if (html.trim() === "") return;
      blocks.push({ type: "paragraph", html });
      return;
    }

    if (tag === "img") {
      const src = $(el).attr("src");
      if (src) blocks.push({ type: "image", src: normalizeImageSrc(src), alt: $(el).attr("alt") ?? "" });
      return;
    }

    if (tag === "ul" || tag === "ol") {
      const items: string[] = [];
      $(el)
        .children("li")
        .each((_j, li) => {
          const html = inlineHtml($, li as Element, styleMap);
          if (html.trim() !== "") items.push(html);
        });
      if (items.length > 0) blocks.push({ type: "list", ordered: tag === "ol", items });
      return;
    }

    if (tag === "blockquote") {
      const html = inlineHtml($, el, styleMap);
      if (html.trim() !== "") blocks.push({ type: "quote", html });
    }
  });

  const title = deriveTitle($, blocks);
  // Avoid rendering the title twice if it is also the first heading.
  if (blocks[0]?.type === "heading" && stripTags(blocks[0].html) === title) {
    blocks.shift();
  }

  return { title, blocks };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function deriveTitle($: cheerio.CheerioAPI, blocks: Block[]): string {
  const firstHeading = blocks.find((b) => b.type === "heading") as
    | Extract<Block, { type: "heading" }>
    | undefined;
  if (firstHeading) return stripTags(firstHeading.html);
  const docTitle = $("title").text().trim();
  if (docTitle) return docTitle;
  return "Zero Latency";
}

export function articleFromHtml(html: string): Article {
  const { title, blocks } = parseGoogleDocHtml(html);
  return { title, blocks, source: "google-doc" };
}
