import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchWebhooks } from "@/lib/webhooks/dispatch";
import { getWalletPassContent } from "./content";
import { MockWalletProvider } from "./mock-provider";
import { AppleWalletProvider, loadAppleWalletCredentials } from "./apple/provider";
import { GoogleWalletProvider, loadGoogleWalletCredentials } from "./google/provider";
import type { WalletPassRecord, WalletProvider } from "./types";
import type { WalletPlatform } from "@/lib/supabase/database.types";

export function getWalletProvider(platform: WalletPlatform): WalletProvider {
  if (platform === "APPLE") {
    const credentials = loadAppleWalletCredentials();
    return credentials ? new AppleWalletProvider(credentials) : new MockWalletProvider("APPLE");
  }
  const credentials = loadGoogleWalletCredentials();
  return credentials ? new GoogleWalletProvider(credentials) : new MockWalletProvider("GOOGLE");
}

function toRecord(row: {
  id: string;
  organization_id: string;
  customer_id: string;
  program_id: string;
  platform: WalletPlatform;
  provider_mode: "LIVE" | "MOCK";
  serial_number: string;
  auth_token: string;
  pass_type_identifier: string | null;
}): WalletPassRecord {
  return {
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
}

/**
 * Issues (or re-fetches) a wallet pass for a customer/program/platform and
 * returns the URL the browser should send the customer to. This is the
 * single entry point the "Add to Apple/Google Wallet" buttons call into.
 */
export async function issueWalletPass(
  customerId: string,
  programId: string,
  platform: WalletPlatform
): Promise<{ saveUrl: string; mode: "LIVE" | "MOCK" } | null> {
  const content = await getWalletPassContent(customerId, programId);
  if (!content) return null;

  const admin = createAdminClient();
  const provider = getWalletProvider(platform);

  const { data: existing } = await admin
    .from("wallet_passes")
    .select("*")
    .eq("customer_id", customerId)
    .eq("program_id", programId)
    .eq("platform", platform)
    .maybeSingle();

  let row = existing;
  if (!row) {
    const { data: created, error } = await admin
      .from("wallet_passes")
      .insert({
        organization_id: content.organization.id,
        customer_id: customerId,
        program_id: programId,
        platform,
        provider_mode: provider.mode,
        serial_number: randomUUID(),
        auth_token: randomBytes(24).toString("hex"),
        pass_type_identifier: platform === "APPLE" ? process.env.APPLE_PASS_TYPE_IDENTIFIER ?? null : null,
      })
      .select("*")
      .single();
    if (error || !created) {
      console.error("[wallet] failed to create wallet_passes row:", error);
      return null;
    }
    row = created;

    await admin.from("events").insert({
      organization_id: content.organization.id,
      type: "customer.wallet_added",
      payload: { customer_id: customerId, program_id: programId, platform },
    });
    await dispatchWebhooks(content.organization.id, "customer.wallet_added", {
      customer_id: customerId,
      program_id: programId,
      platform,
    });
  }

  const record = toRecord(row);
  const saveUrl = await provider.getSaveUrl(record, content);

  await admin.from("wallet_passes").update({ last_pushed_at: new Date().toISOString() }).eq("id", record.id);

  return { saveUrl, mode: provider.mode };
}

/**
 * Pushes updated balance/reward content to every wallet pass a customer has
 * already saved for a program. Called after purchases, manual adjustments
 * and redemptions so the Wallet reflects the new state.
 */
export async function syncWalletPassesForCustomerProgram(customerId: string, programId: string) {
  const content = await getWalletPassContent(customerId, programId);
  if (!content) return;

  const admin = createAdminClient();
  const { data: passes } = await admin
    .from("wallet_passes")
    .select("*")
    .eq("customer_id", customerId)
    .eq("program_id", programId)
    .eq("status", "ACTIVE");

  for (const row of passes ?? []) {
    const provider = getWalletProvider(row.platform);
    try {
      await provider.updatePass(toRecord(row), content);
    } catch (err) {
      console.error(`[wallet] failed to sync pass ${row.id}:`, err);
    }
  }
}

export type { WalletPassContent, WalletPassRecord, WalletProvider } from "./types";
export { getWalletPassContent } from "./content";
