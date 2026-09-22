import "server-only";
import { GoogleAuth } from "google-auth-library";
import jwt from "jsonwebtoken";
import type { GoogleWalletCredentials } from "./certs";
import type { WalletPassContent, WalletPassRecord } from "../types";

const WALLET_API_BASE = "https://walletobjects.googleapis.com/walletobjects/v1";
const SCOPES = ["https://www.googleapis.com/auth/wallet_object.issuer"];

let authClient: GoogleAuth | null = null;

function getAuth(credentials: GoogleWalletCredentials) {
  if (!authClient) {
    authClient = new GoogleAuth({
      credentials: { client_email: credentials.clientEmail, private_key: credentials.privateKey },
      scopes: SCOPES,
    });
  }
  return authClient;
}

async function getAccessToken(credentials: GoogleWalletCredentials): Promise<string> {
  const client = await getAuth(credentials).getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Could not obtain Google access token");
  return token.token;
}

function sanitizeId(id: string) {
  return id.replace(/-/g, "");
}

export function loyaltyClassId(credentials: GoogleWalletCredentials, programId: string) {
  return `${credentials.issuerId}.program_${sanitizeId(programId)}`;
}

export function loyaltyObjectId(credentials: GoogleWalletCredentials, passId: string) {
  return `${credentials.issuerId}.pass_${sanitizeId(passId)}`;
}

async function request(
  credentials: GoogleWalletCredentials,
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown
) {
  const token = await getAccessToken(credentials);
  const res = await fetch(`${WALLET_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

/** Creates the loyalty class for a program if it doesn't already exist, or updates it. */
export async function ensureLoyaltyClass(
  credentials: GoogleWalletCredentials,
  content: WalletPassContent
) {
  const classId = loyaltyClassId(credentials, content.program.id);

  const classResource = {
    id: classId,
    issuerName: content.organization.name,
    programName: content.program.name,
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: content.organization.primaryColor,
    programLogo: {
      sourceUri: { uri: content.organization.logoUrl || "https://walletstore.mx/logo-placeholder.png" },
    },
  };

  const existing = await request(credentials, "GET", `/loyaltyClass/${classId}`);
  if (existing.status === 200) {
    await request(credentials, "PATCH", `/loyaltyClass/${classId}`, classResource);
    return classId;
  }

  const created = await request(credentials, "POST", "/loyaltyClass", classResource);
  if (!created.ok && created.status !== 409) {
    const text = await created.text();
    throw new Error(`Google Wallet: failed to create loyalty class (${created.status}): ${text}`);
  }
  return classId;
}

/** Creates or updates the loyalty object (the actual pass instance) for a customer. */
export async function ensureLoyaltyObject(
  credentials: GoogleWalletCredentials,
  pass: WalletPassRecord,
  content: WalletPassContent
) {
  const classId = loyaltyClassId(credentials, content.program.id);
  const objectId = loyaltyObjectId(credentials, pass.id);
  const isStamps = content.program.type === "STAMPS";

  const objectResource = {
    id: objectId,
    classId,
    state: "ACTIVE",
    accountName: [content.customer.firstName, content.customer.lastName].filter(Boolean).join(" "),
    accountId: content.customer.qrToken,
    loyaltyPoints: {
      label: isStamps ? "Sellos" : "Puntos",
      balance: { string: isStamps ? `${content.balance.stamps}` : `${content.balance.points}` },
    },
    barcode: { type: "QR_CODE", value: content.customer.qrToken },
    textModulesData: content.program.rewardHeadline
      ? [{ header: "Próxima recompensa", body: content.program.rewardHeadline, id: "reward" }]
      : [],
  };

  const existing = await request(credentials, "GET", `/loyaltyObject/${objectId}`);
  if (existing.status === 200) {
    await request(credentials, "PATCH", `/loyaltyObject/${objectId}`, objectResource);
    return objectId;
  }

  const created = await request(credentials, "POST", "/loyaltyObject", objectResource);
  if (!created.ok && created.status !== 409) {
    const text = await created.text();
    throw new Error(`Google Wallet: failed to create loyalty object (${created.status}): ${text}`);
  }
  return objectId;
}

/** Builds the "Save to Google Wallet" JWT-signed link for an existing loyalty object. */
export function buildSaveUrl(credentials: GoogleWalletCredentials, objectId: string) {
  const payload = {
    iss: credentials.clientEmail,
    aud: "google",
    typ: "savetowallet",
    iat: Math.floor(Date.now() / 1000),
    payload: {
      loyaltyObjects: [{ id: objectId }],
    },
  };

  const token = jwt.sign(payload, credentials.privateKey, { algorithm: "RS256" });
  return `https://pay.google.com/gp/v/save/${token}`;
}
