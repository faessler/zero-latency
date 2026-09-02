import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { validatePledge } from "@/lib/pledge";
import { getPledgeStats, savePledge } from "@/lib/pledgeStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Honeypot: real users never fill this hidden field.
  if (payload && typeof payload === "object" && "company" in payload) {
    const company = (payload as Record<string, unknown>).company;
    if (typeof company === "string" && company.trim() !== "") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
  }

  const result = validatePledge(payload);
  if (!result.ok) {
    return NextResponse.json({ error: "Validation failed", fields: result.errors }, { status: 400 });
  }

  try {
    const { id } = await savePledge(result.value);
    revalidatePath("/");
    const stats = await getPledgeStats();
    return NextResponse.json({ ok: true, id, stats }, { status: 201 });
  } catch (err) {
    console.error("[api/pledge] Failed to save pledge:", err);
    return NextResponse.json(
      { error: "Could not save your pledge. Please try again." },
      { status: 500 },
    );
  }
}
