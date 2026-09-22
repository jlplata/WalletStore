import type { WalletPlatform, WalletProviderMode } from "@/lib/supabase/database.types";

export interface WalletPassRecord {
  id: string;
  organizationId: string;
  customerId: string;
  programId: string;
  platform: WalletPlatform;
  providerMode: WalletProviderMode;
  serialNumber: string;
  authToken: string;
  passTypeIdentifier: string | null;
}

export interface WalletPassContent {
  organization: {
    id: string;
    name: string;
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string | null;
  };
  program: {
    id: string;
    name: string;
    type: "STAMPS" | "POINTS";
    rewardHeadline: string | null;
    stampsRequired: number | null;
  };
  customer: {
    firstName: string;
    lastName: string | null;
    qrToken: string;
  };
  balance: {
    stamps: number;
    points: number;
  };
  updatedAt: string;
}

/**
 * A WalletProvider turns a WalletPassRecord + its current content into
 * something the customer's phone can actually add to Apple Wallet / Google
 * Wallet. Implementations: AppleWalletProvider and GoogleWalletProvider
 * (real, require credentials — see docs/apple-wallet-setup.md and
 * docs/google-wallet-setup.md), and MockWalletProvider (default fallback,
 * clearly labeled as a test mode everywhere it surfaces in the UI).
 */
export interface WalletProvider {
  readonly platform: WalletPlatform;
  readonly mode: WalletProviderMode;

  /** URL the client should navigate to / link to in order to add the pass. */
  getSaveUrl(pass: WalletPassRecord, content: WalletPassContent): Promise<string>;

  /**
   * Pushes fresh content (new balance, reward) to a pass the customer has
   * already saved. Apple: sends an APNs push to every registered device so
   * Wallet re-fetches the pass. Google: patches the loyalty object directly
   * (Google Wallet reflects the change without any push step). Mock: no-op.
   */
  updatePass(pass: WalletPassRecord, content: WalletPassContent): Promise<void>;

  /** Marks the pass void with the provider, if the provider tracks that. */
  voidPass(pass: WalletPassRecord): Promise<void>;
}
