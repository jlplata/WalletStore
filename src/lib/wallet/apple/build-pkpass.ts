import "server-only";
import crypto from "node:crypto";
import forge from "node-forge";
import JSZip from "jszip";
import type { AppleWalletCredentials } from "./certs";
import type { WalletPassContent, WalletPassRecord } from "../types";
import { createSolidPng } from "./png";

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2) || "17", 16);
  const g = parseInt(clean.slice(2, 4) || "17", 16);
  const b = parseInt(clean.slice(4, 6) || "17", 16);
  return `rgb(${r}, ${g}, ${b})`;
}

function buildPassJson(
  credentials: AppleWalletCredentials,
  pass: WalletPassRecord,
  content: WalletPassContent
) {
  const isStamps = content.program.type === "STAMPS";
  const balanceValue = isStamps
    ? `${content.balance.stamps} / ${content.program.stampsRequired ?? "–"}`
    : `${content.balance.points}`;

  return {
    formatVersion: 1,
    passTypeIdentifier: credentials.passTypeIdentifier,
    teamIdentifier: credentials.teamIdentifier,
    serialNumber: pass.serialNumber,
    webServiceURL: credentials.webServiceUrl,
    authenticationToken: pass.authToken,
    organizationName: content.organization.name,
    description: `${content.organization.name} — ${content.program.name}`,
    logoText: content.organization.name,
    backgroundColor: hexToRgb(content.organization.primaryColor),
    foregroundColor: hexToRgb(content.organization.secondaryColor),
    labelColor: hexToRgb(content.organization.secondaryColor),
    storeCard: {
      primaryFields: [
        {
          key: "balance",
          label: isStamps ? "SELLOS" : "PUNTOS",
          value: balanceValue,
        },
      ],
      secondaryFields: [
        {
          key: "reward",
          label: "PRÓXIMA RECOMPENSA",
          value: content.program.rewardHeadline ?? "—",
        },
      ],
      auxiliaryFields: [
        {
          key: "member",
          label: "CLIENTE",
          value: [content.customer.firstName, content.customer.lastName].filter(Boolean).join(" "),
        },
      ],
      backFields: [
        {
          key: "program",
          label: "Programa",
          value: content.program.name,
        },
      ],
    },
    barcodes: [
      {
        message: content.customer.qrToken,
        format: "PKBarcodeFormatQR",
        messageEncoding: "iso-8859-1",
      },
    ],
  };
}

/**
 * Builds a signed .pkpass file per Apple's PassKit Package Format Reference:
 * pass.json + placeholder artwork, a manifest.json of SHA-1 hashes, and a
 * detached PKCS#7 signature over the manifest (using the Pass Type ID
 * certificate + WWDR intermediate). Requires real Apple Developer
 * credentials — see docs/apple-wallet-setup.md. Never called when
 * credentials are missing (AppleWalletProvider falls back to MockWalletProvider).
 */
export async function buildPkpass(
  credentials: AppleWalletCredentials,
  pass: WalletPassRecord,
  content: WalletPassContent
): Promise<Buffer> {
  const files = new Map<string, Buffer>();

  files.set("pass.json", Buffer.from(JSON.stringify(buildPassJson(credentials, pass, content)), "utf8"));
  files.set("icon.png", createSolidPng(29, 29, content.organization.primaryColor));
  files.set("icon@2x.png", createSolidPng(58, 58, content.organization.primaryColor));
  files.set("icon@3x.png", createSolidPng(87, 87, content.organization.primaryColor));
  files.set("logo.png", createSolidPng(160, 50, content.organization.primaryColor));
  files.set("logo@2x.png", createSolidPng(320, 100, content.organization.primaryColor));

  const manifest: Record<string, string> = {};
  for (const [name, buf] of files) {
    manifest[name] = crypto.createHash("sha1").update(buf).digest("hex");
  }
  const manifestBuffer = Buffer.from(JSON.stringify(manifest), "utf8");

  const signature = signManifest(credentials, manifestBuffer);

  const zip = new JSZip();
  for (const [name, buf] of files) zip.file(name, buf);
  zip.file("manifest.json", manifestBuffer);
  zip.file("signature", signature);

  return zip.generateAsync({ type: "nodebuffer" });
}

function signManifest(credentials: AppleWalletCredentials, manifest: Buffer): Buffer {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(manifest.toString("binary"));
  p7.addCertificate(credentials.wwdrCertificate);
  p7.addCertificate(credentials.certificate);
  p7.addSigner({
    key: credentials.privateKey,
    certificate: credentials.certificate,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      // forge's runtime accepts a Date here (it calls asn1.dateToUtcTime
      // internally) even though its type defs only declare `string`.
      { type: forge.pki.oids.signingTime, value: new Date() as unknown as string },
    ],
  });
  p7.sign({ detached: true });

  const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return Buffer.from(der, "binary");
}
