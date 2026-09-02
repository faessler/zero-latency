import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  extractDocId,
  parseGoogleDocHtml,
  resolveSourceUrl,
} from "./parseGoogleDoc";

const fixture = readFileSync(
  join(process.cwd(), "public", "sample-doc.html"),
  "utf8",
);

describe("extractDocId", () => {
  it("reads the id from a normal edit URL", () => {
    expect(
      extractDocId("https://docs.google.com/document/d/ABC123_doc-Id/edit"),
    ).toBe("ABC123_doc-Id");
  });

  it("reads the id from a published URL", () => {
    expect(
      extractDocId("https://docs.google.com/document/d/e/PUB-xyz_9/pub"),
    ).toBe("PUB-xyz_9");
  });

  it("returns null when there is no id", () => {
    expect(extractDocId("https://example.com/foo")).toBeNull();
  });
});

describe("resolveSourceUrl", () => {
  it("maps a normal doc to the HTML export endpoint", () => {
    expect(
      resolveSourceUrl("https://docs.google.com/document/d/ABC123/edit"),
    ).toBe("https://docs.google.com/document/d/ABC123/export?format=html");
  });

  it("keeps a published doc URL as-is", () => {
    const url = "https://docs.google.com/document/d/e/PUB99/pub";
    expect(resolveSourceUrl(url)).toBe(url);
  });

  it("passes non-google URLs through unchanged", () => {
    const url = "http://localhost:3000/sample-doc.html";
    expect(resolveSourceUrl(url)).toBe(url);
  });
});

describe("parseGoogleDocHtml", () => {
  const { title, blocks } = parseGoogleDocHtml(fixture);

  it("derives the title and does not duplicate it as a block", () => {
    expect(title).toBe("Zero Latency");
    const headings = blocks.filter((b) => b.type === "heading");
    expect(headings.every((h) => h.type === "heading" && h.html !== "Zero Latency")).toBe(true);
  });

  it("preserves bold and italic as semantic markup", () => {
    const intro = blocks.find(
      (b) => b.type === "paragraph" && b.html.includes("last frontier"),
    );
    expect(intro).toBeTruthy();
    if (intro && intro.type === "paragraph") {
      expect(intro.html).toContain("<strong>last frontier</strong>");
      expect(intro.html).toContain("<em>time itself</em>");
    }
  });

  it("unwraps Google redirect links to the real destination", () => {
    const intro = blocks.find(
      (b) => b.type === "paragraph" && b.html.includes("background here"),
    );
    if (intro && intro.type === "paragraph") {
      expect(intro.html).toContain('href="https://vercel.com"');
      expect(intro.html).not.toContain("google.com/url");
    }
  });

  it("extracts headings, lists and images", () => {
    expect(blocks.some((b) => b.type === "heading" && b.html.includes("round trip"))).toBe(true);
    const list = blocks.find((b) => b.type === "list");
    expect(list && list.type === "list" && list.items.length).toBe(2);
    expect(blocks.some((b) => b.type === "image" && b.src.includes("zero-latency-hero"))).toBe(true);
  });

  it("drops empty paragraphs", () => {
    expect(
      blocks.some((b) => b.type === "paragraph" && b.html.trim() === ""),
    ).toBe(false);
  });
});

describe("image proxying", () => {
  it("rewrites googleusercontent images to the proxy route", () => {
    const html = `<html><body><div><p><img src="https://lh3.googleusercontent.com/abc123" alt="x"></p></div></body></html>`;
    const { blocks } = parseGoogleDocHtml(html);
    const img = blocks.find((b) => b.type === "image");
    expect(img && img.type === "image" && img.src.startsWith("/api/image?src=")).toBe(true);
  });
});
