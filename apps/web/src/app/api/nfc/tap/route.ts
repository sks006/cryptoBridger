// apps/web/src/app/api/nfc/tap/route.ts
//
// Thin proxy to the Rust backend POST /nfc/tap endpoint.
// Keeps the backend URL server-side only (never exposed to the browser).

import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

export async function GET() {
  const res = await fetch(`${BACKEND_URL}/nfc/nonce`);
  const data = await res.text(); // backend returns plain text
  return new NextResponse(data, {
    status: res.status,
    headers: { "Content-Type": "text/plain" },
  });
}