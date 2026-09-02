import { NextResponse } from "next/server";

const ALLOWED_HOSTS = ["googleusercontent.com", "ggpht.com"];

function isAllowed(src: string): boolean {
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    return ALLOWED_HOSTS.some(
      (h) => url.hostname === h || url.hostname.endsWith(`.${h}`),
    );
  } catch {
    return false;
  }
}

/**
 * Proxy for images embedded in the Google Doc. Google serves them from
 * googleusercontent.com; proxying keeps them same-origin and avoids referrer/hotlink
 * issues. Only whitelisted hosts are allowed.
 */
export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src");
  if (!src || !isAllowed(src)) {
    return NextResponse.json({ error: "Invalid image source" }, { status: 400 });
  }

  try {
    const upstream = await fetch(src, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ZeroLatencySite/1.0)" },
      next: { revalidate: 86_400 },
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type") ?? "image/png";
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }
}
