import "server-only";
import type { WalletPassRecord, WalletPassContent, WalletProvider } from "../types";
import type { AppleWalletCredentials } from "./certs";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendApplePassPush } from "./apns";

export class AppleWalletProvider implements WalletProvider {
  readonly platform = "APPLE" as const;
  readonly mode = "LIVE" as const;

  constructor(private credentials: AppleWalletCredentials) {}

  async getSaveUrl(pass: WalletPassRecord) {
    // The .pkpass itself is generated on demand by the Route Handler below
    // (build-pkpass.ts needs live balance data, so we don't pre-render it).
    return `/api/wallet/apple/passes/${pass.serialNumber}.pkpass`;
  }

  async updatePass(pass: WalletPassRecord) {
    const admin = createAdminClient();
    const { data: devices } = await admin
      .from("wallet_devices")
      .select("push_token")
      .eq("wallet_pass_id", pass.id);

    for (const device of devices ?? []) {
      const result = await sendApplePassPush(this.credentials, device.push_token);
      if (!result.ok) {
        console.error(`[apple-wallet] push failed for pass ${pass.id}:`, result.error ?? result.status);
      }
    }

    await admin.from("wallet_passes").update({ last_pushed_at: new Date().toISOString() }).eq("id", pass.id);
  }

  async voidPass(pass: WalletPassRecord) {
    // Devices registered for this pass will get a 410 from the web service
    // on their next poll (see /api/wallet/apple/v1/passes route), which is
    // how PassKit signals "this pass is no longer valid". Nothing to call
    // out to Apple directly for.
    const admin = createAdminClient();
    await admin.from("wallet_passes").update({ status: "VOIDED" }).eq("id", pass.id);
  }
}

export { loadAppleWalletCredentials } from "./certs";
export { buildPkpass } from "./build-pkpass";
export type { WalletPassContent };
