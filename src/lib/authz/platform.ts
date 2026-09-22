import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "./session";

/** Guards every /admin/... route. Redirects non-platform-admins away. */
export async function requirePlatformAdmin() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_platform_admin) {
    redirect("/dashboard");
  }

  return user;
}
