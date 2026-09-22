import { NextResponse } from "next/server";

// PassKit Web Service: error logging endpoint Wallet calls when something
// goes wrong on-device. We just log server-side; never exposes secrets.
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { logs?: string[] } | null;
  for (const line of body?.logs ?? []) {
    console.warn("[apple-wallet:device-log]", line);
  }
  return NextResponse.json({}, { status: 200 });
}
