import { NextResponse } from "next/server";
import { getApplePassRowBySerial, buildPkpassForSerial } from "@/lib/wallet/apple/serve-pass";

// PassKit Web Service: fetch the latest version of a pass.
// https://developer.apple.com/documentation/walletpasses/get-the-latest-version-of-a-pass
export async function GET(
  request: Request,
  { params }: { params: Promise<{ passTypeIdentifier: string; serialNumber: string }> }
) {
  const { passTypeIdentifier, serialNumber } = await params;
  const row = await getApplePassRowBySerial(serialNumber);

  if (!row || row.pass_type_identifier !== passTypeIdentifier) {
    return NextResponse.json({}, { status: 404 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader !== `ApplePass ${row.auth_token}`) {
    return NextResponse.json({}, { status: 401 });
  }

  const ifModifiedSince = request.headers.get("if-modified-since");
  if (ifModifiedSince && row.last_pushed_at && new Date(row.last_pushed_at) <= new Date(ifModifiedSince)) {
    return new NextResponse(null, { status: 304 });
  }

  const buffer = await buildPkpassForSerial(serialNumber);
  if (!buffer) {
    return NextResponse.json({}, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Last-Modified": (row.last_pushed_at ? new Date(row.last_pushed_at) : new Date()).toUTCString(),
      "Cache-Control": "no-store",
    },
  });
}
