import { NextResponse } from "next/server";
import { issueWalletPass } from "@/lib/wallet";
import type { WalletPlatform } from "@/lib/supabase/database.types";

// Entry point for the "Add to Apple/Google Wallet" buttons on the public
// join page. A plain GET so it works as a normal link (no JS required),
// and redirects straight to whatever the provider says to save the pass
// (a signed pay.google.com link, our own .pkpass download, or the mock
// preview page when no real credentials are configured).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ customerId: string; programId: string; platform: string }> }
) {
  const { customerId, programId, platform } = await params;

  if (platform !== "APPLE" && platform !== "GOOGLE") {
    return NextResponse.json({ error: "invalid platform" }, { status: 400 });
  }

  const result = await issueWalletPass(customerId, programId, platform as WalletPlatform);
  if (!result) {
    return NextResponse.json({ error: "could not issue pass" }, { status: 404 });
  }

  const url = result.saveUrl.startsWith("http")
    ? result.saveUrl
    : new URL(result.saveUrl, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");

  return NextResponse.redirect(url, { status: 302 });
}
