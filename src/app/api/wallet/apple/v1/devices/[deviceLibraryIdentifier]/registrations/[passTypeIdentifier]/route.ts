import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// PassKit Web Service: list passes updated since a given tag for a device.
// https://developer.apple.com/documentation/walletpasses/get-the-list-of-updatable-passes
export async function GET(
  request: Request,
  { params }: { params: Promise<{ deviceLibraryIdentifier: string; passTypeIdentifier: string }> }
) {
  const { deviceLibraryIdentifier, passTypeIdentifier } = await params;
  const since = new URL(request.url).searchParams.get("passesUpdatedSince");

  const admin = createAdminClient();
  const { data: devices } = await admin
    .from("wallet_devices")
    .select("wallet_pass_id")
    .eq("device_library_identifier", deviceLibraryIdentifier);

  const passIds = (devices ?? []).map((d) => d.wallet_pass_id);
  if (passIds.length === 0) {
    return NextResponse.json({}, { status: 204 });
  }

  let query = admin
    .from("wallet_passes")
    .select("serial_number, last_pushed_at")
    .in("id", passIds)
    .eq("pass_type_identifier", passTypeIdentifier)
    .eq("status", "ACTIVE");

  if (since) {
    query = query.gt("last_pushed_at", since);
  }

  const { data: passes } = await query;
  if (!passes || passes.length === 0) {
    return NextResponse.json({}, { status: 204 });
  }

  return NextResponse.json({
    lastUpdated: new Date().toISOString(),
    serialNumbers: passes.map((p) => p.serial_number),
  });
}
