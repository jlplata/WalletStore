import "server-only";
import http2 from "node:http2";
import type { AppleWalletCredentials } from "./certs";

const APNS_HOST = process.env.APPLE_APNS_SANDBOX === "true" ? "api.sandbox.push.apple.com" : "api.push.apple.com";

/**
 * Sends a real APNs push notification telling a device's Wallet app to
 * re-fetch an updated pass. Uses mutual TLS with the same Pass Type ID
 * certificate used to sign passes (Apple issues that certificate valid for
 * both signing and APNs push for its topic) via Node's built-in HTTP/2
 * client — no extra push-notification library needed.
 *
 * Pass-update pushes carry an empty JSON payload; the Wallet app itself
 * decides to call back into our web service (see /api/wallet/apple/v1/passes)
 * to fetch the new pass content.
 */
export async function sendApplePassPush(
  credentials: AppleWalletCredentials,
  pushToken: string
): Promise<{ ok: boolean; status?: number; error?: string }> {
  return new Promise((resolve) => {
    let client: http2.ClientHttp2Session;
    try {
      client = http2.connect(`https://${APNS_HOST}`, {
        cert: credentials.certificatePem,
        key: credentials.privateKeyPem,
        passphrase: credentials.privateKeyPassphrase,
      });
    } catch (err) {
      resolve({ ok: false, error: err instanceof Error ? err.message : "connect failed" });
      return;
    }

    client.on("error", (err) => {
      resolve({ ok: false, error: err.message });
    });

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${pushToken}`,
      "apns-topic": credentials.passTypeIdentifier,
      "apns-push-type": "background",
      "apns-priority": "5",
      "content-type": "application/json",
    });

    let status = 0;
    req.on("response", (headers) => {
      status = Number(headers[":status"] ?? 0);
    });

    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      client.close();
      resolve({ ok: status >= 200 && status < 300, status, error: status >= 300 ? body : undefined });
    });

    req.on("error", (err) => {
      resolve({ ok: false, error: err.message });
    });

    req.end(JSON.stringify({}));
  });
}
