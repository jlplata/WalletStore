import "server-only";

export interface GoogleWalletCredentials {
  issuerId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Reads Google Wallet credentials from environment variables. Returns null
 * (never throws) when missing, so callers fall back to MockWalletProvider.
 * See docs/google-wallet-setup.md.
 */
export function loadGoogleWalletCredentials(): GoogleWalletCredentials | null {
  const { GOOGLE_WALLET_ISSUER_ID, GOOGLE_SERVICE_ACCOUNT_JSON } = process.env;
  if (!GOOGLE_WALLET_ISSUER_ID || !GOOGLE_SERVICE_ACCOUNT_JSON) return null;

  try {
    const key = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON) as {
      client_email?: string;
      private_key?: string;
    };
    if (!key.client_email || !key.private_key) return null;

    return {
      issuerId: GOOGLE_WALLET_ISSUER_ID,
      clientEmail: key.client_email,
      privateKey: key.private_key,
    };
  } catch (err) {
    console.error("[google-wallet] failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:", err);
    return null;
  }
}
