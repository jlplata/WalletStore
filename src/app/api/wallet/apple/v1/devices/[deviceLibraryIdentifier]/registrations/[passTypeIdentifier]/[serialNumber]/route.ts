import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getApplePassRowBySerial } from "@/lib/wallet/apple/serve-pass";

type Params = {
  deviceLibraryIdentifier: string;
  passTypeIdentifier: string;
  serialNumber: string;
};

function checkAuth(request: Request, authToken: string) {
  const header = request.headers.get("authorization") ?? "";
  return header === `ApplePass ${authToken}`;
}

// PassKit Web Service: register a device for update pushes on a pass.
// https://developer.apple.com/documentation/walletpasses/register-a-pass-for-update-notifications
export async function POST(request: Request, { params }: { params: Promise<Params> }) {
  const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await params;
  const row = await getApplePassRowBySerial(serialNumber);

  if (!row || row.pass_type_identifier !== passTypeIdentifier) {
    return NextResponse.json({}, { status: 404 });
  }
  if (!checkAuth(request, row.auth_token)) {
    return NextResponse.json({}, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { pushToken?: string } | null;
  if (!body?.pushToken) {
    return NextResponse.json({ error: "pushToken required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("wallet_devices")
    .select("id")
    .eq("wallet_pass_id", row.id)
    .eq("device_library_identifier", deviceLibraryIdentifier)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({}, { status: 200 });
  }

  await admin.from("wallet_devices").insert({
    wallet_pass_id: row.id,
    device_library_identifier: deviceLibraryIdentifier,
    push_token: body.pushToken,
  });

  return NextResponse.json({}, { status: 201 });
}

// Unregister a device (user removed the pass from Wallet).
export async function DELETE(request: Request, { params }: { params: Promise<Params> }) {
  const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = await params;
  const row = await getApplePassRowBySerial(serialNumber);

  if (!row || row.pass_type_identifier !== passTypeIdentifier) {
    return NextResponse.json({}, { status: 404 });
  }
  if (!checkAuth(request, row.auth_token)) {
    return NextResponse.json({}, { status: 401 });
  }

  const admin = createAdminClient();
  await admin
    .from("wallet_devices")
    .delete()
    .eq("wallet_pass_id", row.id)
    .eq("device_library_identifier", deviceLibraryIdentifier);

  return NextResponse.json({}, { status: 200 });
}
