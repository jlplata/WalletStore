import { NextResponse } from "next/server";
import { buildPkpassForSerial } from "@/lib/wallet/apple/serve-pass";

// Public download link surfaced by the "Add to Apple Wallet" button. The
// serial number is an unguessable UUID; no additional auth is required for
// the initial install (matches how a shared pass link typically works).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ serial: string }> }
) {
  const { serial } = await params;
  const serialNumber = serial.replace(/\.pkpass$/i, "");

  const buffer = await buildPkpassForSerial(serialNumber);
  if (!buffer) {
    return NextResponse.json({ error: "pass not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${serialNumber}.pkpass"`,
      "Cache-Control": "no-store",
    },
  });
}
