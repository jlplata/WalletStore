import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWalletPassContent } from "../content";
import { loadAppleWalletCredentials } from "./certs";
import { buildPkpass } from "./build-pkpass";
import type { WalletPassRecord } from "../types";

export async function getApplePassRowBySerial(serialNumber: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("wallet_passes")
    .select("*")
    .eq("serial_number", serialNumber)
    .eq("platform", "APPLE")
    .maybeSingle();
  return data;
}

export async function buildPkpassForSerial(serialNumber: string): Promise<Buffer | null> {
  const row = await getApplePassRowBySerial(serialNumber);
  if (!row) return null;

  const credentials = loadAppleWalletCredentials();
  if (!credentials) return null;

  const content = await getWalletPassContent(row.customer_id, row.program_id);
  if (!content) return null;

  const record: WalletPassRecord = {
    id: row.id,
    organizationId: row.organization_id,
    customerId: row.customer_id,
    programId: row.program_id,
    platform: row.platform,
    providerMode: row.provider_mode,
    serialNumber: row.serial_number,
    authToken: row.auth_token,
    passTypeIdentifier: row.pass_type_identifier,
  };

  return buildPkpass(credentials, record, content);
}
