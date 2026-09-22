import "server-only";
import type { WalletPassRecord, WalletProvider } from "./types";
import type { WalletPlatform } from "@/lib/supabase/database.types";

/**
 * Fallback provider used whenever Apple/Google credentials aren't
 * configured (see docs/apple-wallet-setup.md, docs/google-wallet-setup.md).
 * Never pretends to produce a real .pkpass or Google Wallet object — it
 * links to an in-app preview page that says "modo de prueba" explicitly.
 */
export class MockWalletProvider implements WalletProvider {
  readonly mode = "MOCK" as const;

  constructor(readonly platform: WalletPlatform) {}

  async getSaveUrl(pass: WalletPassRecord) {
    return `/wallet/mock/${pass.id}`;
  }

  async updatePass() {
    // No external pass to refresh in mock mode; the preview page always
    // reads live balance from the database.
  }

  async voidPass() {
    // No external state to void in mock mode.
  }
}
