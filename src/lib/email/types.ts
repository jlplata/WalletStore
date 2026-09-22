export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface EmailProvider {
  readonly mode: "live" | "console";
  send(input: SendEmailInput): Promise<{ id: string | null }>;
}
