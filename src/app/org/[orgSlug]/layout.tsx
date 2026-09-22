import { notFound, redirect } from "next/navigation";
import { requireUser, getOrgMembership } from "@/lib/authz/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app/app-shell";

export default async function OrgLayout({
  children,
  params,
}: LayoutProps<"/org/[orgSlug]">) {
  const { orgSlug } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, slug, status")
    .eq("slug", orgSlug)
    .maybeSingle();

  if (!org) {
    notFound();
  }

  const membership = await getOrgMembership(org.id);
  if (!membership) {
    redirect("/dashboard");
  }

  return (
    <AppShell
      orgName={org.name}
      orgSlug={org.slug}
      role={membership.role}
      userEmail={user.email ?? ""}
    >
      {children}
    </AppShell>
  );
}
