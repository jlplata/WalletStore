import "server-only";
import type { WalletPassRecord, WalletPassContent, WalletProvider } from "../types";
import type { GoogleWalletCredentials } from "./certs";
import { ensureLoyaltyClass, ensureLoyaltyObject, buildSaveUrl } from "./api";

export class GoogleWalletProvider implements WalletProvider {
  readonly platform = "GOOGLE" as const;
  readonly mode = "LIVE" as const;

  constructor(private credentials: GoogleWalletCredentials) {}

  async getSaveUrl(pass: WalletPassRecord, content: WalletPassContent) {
    await ensureLoyaltyClass(this.credentials, content);
    const objectId = await ensureLoyaltyObject(this.credentials, pass, content);
    return buildSaveUrl(this.credentials, objectId);
  }

  async updatePass(pass: WalletPassRecord, content: WalletPassContent) {
    // Google Wallet has no separate "push" step: patching the object is
    // enough, the OS syncs it automatically.
    await ensureLoyaltyClass(this.credentials, content);
    await ensureLoyaltyObject(this.credentials, pass, content);
  }

  async voidPass() {
    // Google Wallet objects don't need explicit deletion; setting state to
    // INACTIVE on the next content update (see ensureLoyaltyObject) is the
    // documented way to retire a pass. Handled by the next getSaveUrl/update
    // call if the pass is reissued; nothing to do synchronously here.
  }
}

export { loadGoogleWalletCredentials } from "./certs";
