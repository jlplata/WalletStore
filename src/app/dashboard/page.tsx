import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/authz/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Entry point after login. Resolves which organization to send the user to
// (there is no "current org" in the session — org id always comes from the
// URL, see /org/[orgSlug]) so a staff member who works at two businesses can
// pick, while the common case (one org) redirects straight through.
export default async function DashboardEntryPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_platform_admin")
    .eq("id", user.id)
    .single();

  if (profile?.is_platform_admin) {
    redirect("/admin");
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(slug, name)")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    redirect("/onboarding");
  }

  if (memberships.length === 1) {
    const org = memberships[0].organizations as unknown as { slug: string } | null;
    if (org?.slug) redirect(`/org/${org.slug}/dashboard`);
  }

  return (
    <div className="mx-auto max-w-lg py-16">
      <h1 className="mb-6 text-2xl font-semibold">Elige un negocio</h1>
      <div className="space-y-3">
        {memberships.map((m) => {
          const org = m.organizations as unknown as { slug: string; name: string } | null;
          if (!org) return null;
          return (
            <Card key={m.organization_id}>
              <CardHeader>
                <Link href={`/org/${org.slug}/dashboard`}>
                  <CardTitle>{org.name}</CardTitle>
                  <CardDescription>Ir al panel →</CardDescription>
                </Link>
              </CardHeader>
              <CardContent />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
