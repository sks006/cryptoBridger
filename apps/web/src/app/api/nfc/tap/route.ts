// apps/web/src/app/api/nfc/tap/route.ts
//
// Thin proxy to the Rust backend POST /nfc/tap endpoint.
// Keeps the backend URL server-side only (never exposed to the browser).

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }

  let backendRes: Response;
  try {
    backendRes = await fetch(`${BACKEND_URL}/nfc/tap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      // Forward the original request signal so aborting the client fetch
      // also cancels the upstream request
      signal: req.signal,
    });
  } catch (err) {
    console.error("[/api/nfc/tap] Backend unreachable:", err);
    return NextResponse.json(
      { message: "Payment backend unavailable. Please try again." },
      { status: 503 },
    );
  }

  const data = await backendRes.json().catch(() => ({}));

  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status });
  }

  return NextResponse.json(data);
}