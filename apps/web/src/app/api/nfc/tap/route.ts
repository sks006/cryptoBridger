// apps/web/src/app/api/nfc/nonce/route.ts
//
// GET proxy → Rust backend /nfc/nonce.
//
// The frontend (web-nfc.ts) calls fetch("/api/nfc/nonce") expecting a JSON
// object: { "nonce": "..." }. This route forwards that call to the backend,
// keeping BACKEND_URL server-side so it never appears in the browser.

import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/nfc/nonce`, {
      // Defeat any CDN caching — every nonce must be fresh
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend returned ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e: any) {
    console.error("Nonce proxy error:", e);
    return NextResponse.json(
      { error: "Backend unreachable" },
      { status: 502 },
    );
  }
}