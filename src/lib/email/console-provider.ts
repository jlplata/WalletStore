import "server-only";
import type { EmailProvider, SendEmailInput } from "./types";

// Dev/fallback provider: logs the email instead of sending it. Used
// automatically when RESEND_API_KEY is not configured (see index.ts).
export class ConsoleEmailProvider implements EmailProvider {
  readonly mode = "console" as const;

  async send(input: SendEmailInput) {
    console.log(
      `[email:console] to=${input.to} subject="${input.subject}"\n${input.html}`
    );
    return { id: null };
  }
}
