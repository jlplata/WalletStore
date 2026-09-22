import "server-only";
import forge from "node-forge";

export interface AppleWalletCredentials {
  teamIdentifier: string;
  passTypeIdentifier: string;
  webServiceUrl: string;
  certificate: forge.pki.Certificate;
  privateKey: forge.pki.rsa.PrivateKey;
  wwdrCertificate: forge.pki.Certificate;
  /** Raw PEM strings, kept alongside the parsed forge objects above because
   *  the APNs push client (node:tls / node:http2) needs PEM, not forge
   *  objects. */
  certificatePem: string;
  privateKeyPem: string;
  privateKeyPassphrase?: string;
}

/**
 * Reads Apple Wallet credentials from environment variables. Returns null
 * (never throws) when any required variable is missing, so callers can
 * cleanly fall back to MockWalletProvider instead of crashing requests that
 * don't need Apple Wallet. See docs/apple-wallet-setup.md.
 */
export function loadAppleWalletCredentials(): AppleWalletCredentials | null {
  const {
    APPLE_TEAM_IDENTIFIER,
    APPLE_PASS_TYPE_IDENTIFIER,
    APPLE_WEB_SERVICE_URL,
    APPLE_CERTIFICATE_BASE64,
    APPLE_PRIVATE_KEY_BASE64,
    APPLE_PRIVATE_KEY_PASSPHRASE,
    APPLE_WWDR_CERTIFICATE_BASE64,
  } = process.env;

  if (
    !APPLE_TEAM_IDENTIFIER ||
    !APPLE_PASS_TYPE_IDENTIFIER ||
    !APPLE_WEB_SERVICE_URL ||
    !APPLE_CERTIFICATE_BASE64 ||
    !APPLE_PRIVATE_KEY_BASE64 ||
    !APPLE_WWDR_CERTIFICATE_BASE64
  ) {
    return null;
  }

  try {
    const certPem = Buffer.from(APPLE_CERTIFICATE_BASE64, "base64").toString("utf8");
    const keyPem = Buffer.from(APPLE_PRIVATE_KEY_BASE64, "base64").toString("utf8");
    const wwdrPem = Buffer.from(APPLE_WWDR_CERTIFICATE_BASE64, "base64").toString("utf8");

    const certificate = forge.pki.certificateFromPem(certPem);
    const wwdrCertificate = forge.pki.certificateFromPem(wwdrPem);

    let privateKey: forge.pki.PrivateKey;
    if (APPLE_PRIVATE_KEY_PASSPHRASE) {
      const encrypted = forge.pki.encryptedPrivateKeyFromPem(keyPem);
      const asn1 = forge.pki.decryptPrivateKeyInfo(encrypted, APPLE_PRIVATE_KEY_PASSPHRASE);
      if (!asn1) throw new Error("wrong passphrase or invalid key");
      privateKey = forge.pki.privateKeyFromAsn1(asn1);
    } else {
      privateKey = forge.pki.privateKeyFromPem(keyPem);
    }

    return {
      teamIdentifier: APPLE_TEAM_IDENTIFIER,
      passTypeIdentifier: APPLE_PASS_TYPE_IDENTIFIER,
      webServiceUrl: APPLE_WEB_SERVICE_URL,
      certificate,
      privateKey,
      wwdrCertificate,
      certificatePem: certPem,
      privateKeyPem: keyPem,
      privateKeyPassphrase: APPLE_PRIVATE_KEY_PASSPHRASE,
    };
  } catch (err) {
    console.error("[apple-wallet] failed to load credentials:", err);
    return null;
  }
}
