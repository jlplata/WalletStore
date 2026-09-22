import { NextResponse } from "next/server";
import QRCode from "qrcode";

// Renders a QR code as PNG for any URL that belongs to this app (join
// pages, invitations). Not a general-purpose QR proxy: restricted to our
// own origin to avoid being abused as an open redirect/SSRF-style QR
// generator for arbitrary URLs.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const target = searchParams.get("url");

  if (!target || !target.startsWith(origin)) {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  const buffer = await QRCode.toBuffer(target, { width: 480, margin: 2 });
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
