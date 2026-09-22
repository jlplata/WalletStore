import "server-only";
import { ConsoleEmailProvider } from "./console-provider";
import { ResendEmailProvider } from "./resend-provider";
import type { EmailProvider } from "./types";

let cached: EmailProvider | null = null;

// Picks the real Resend adapter when RESEND_API_KEY is configured, otherwise
// falls back to logging emails to the console. Never silently pretends a
// console-logged email was delivered — callers can check `.mode`.
export function getEmailProvider(): EmailProvider {
  if (cached) return cached;

  const apiKey = process.env.RESEND_API_KEY;
  cached =
    apiKey && apiKey.length > 0
      ? new ResendEmailProvider(apiKey, process.env.RESEND_FROM_EMAIL ?? "WalletStore <notificaciones@walletstore.mx>")
      : new ConsoleEmailProvider();

  return cached;
}

export type { EmailProvider, SendEmailInput } from "./types";
