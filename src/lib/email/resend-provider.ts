import "server-only";
import { Resend } from "resend";
import type { EmailProvider, SendEmailInput } from "./types";

export class ResendEmailProvider implements EmailProvider {
  readonly mode = "live" as const;
  private client: Resend;
  private defaultFrom: string;

  constructor(apiKey: string, defaultFrom: string) {
    this.client = new Resend(apiKey);
    this.defaultFrom = defaultFrom;
  }

  async send(input: SendEmailInput) {
    const { data, error } = await this.client.emails.send({
      from: input.from ?? this.defaultFrom,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    if (error) throw new Error(error.message);
    return { id: data?.id ?? null };
  }
}
