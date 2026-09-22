import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = { app: "ok", database: "ok" };

  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("plans")
      .select("id", { count: "exact", head: true });
    if (error) throw error;
  } catch {
    checks.database = "error";
  }

  const healthy = Object.values(checks).every((v) => v === "ok");

  return NextResponse.json(
    { status: healthy ? "healthy" : "degraded", checks },
    { status: healthy ? 200 : 503 }
  );
}
