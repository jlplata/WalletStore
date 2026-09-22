import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/utils";
import { SuspendButton } from "./suspend-button";

export default async function AdminOrganizationDetailPage({
  params,
}: PageProps<"/admin/organizations/[orgId]">) {
  const { orgId } = await params;
  const supabase = await createClient();

  const { data: org } = await supabase.from("organizations").select("*").eq("id", orgId).single();
  if (!org) notFound();

  const [{ data: owner }, { count: branchesCount }, { count: customersCount }, { count: staffCount }, { data: subscription }] =
    await Promise.all([
      supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", orgId)
        .eq("role", "ORGANIZATION_OWNER")
        .maybeSingle(),
      supabase.from("branches").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("organization_members").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
      supabase.from("subscriptions").select("*, plans(name)").eq("organization_id", orgId).maybeSingle(),
    ]);

  let ownerEmail: string | null = null;
  if (owner?.user_id) {
    const admin = createAdminClient();
    const { data } = await admin.auth.admin.getUserById(owner.user_id);
    ownerEmail = data?.user?.email ?? null;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{org.name}</h1>
          <p className="text-sm text-muted-foreground">/{org.slug} · {org.category ?? "sin categoría"}</p>
        </div>
        <Badge variant={org.status === "ACTIVE" ? "success" : org.status === "SUSPENDED" ? "destructive" : "secondary"}>
          {org.status}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-muted-foreground">Dueño</p>
            <p>{ownerEmail ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">País / Moneda</p>
            <p>{org.country} / {org.currency}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Creada</p>
            <p>{formatDate(org.created_at)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Prueba hasta</p>
            <p>{org.trial_ends_at ? formatDate(org.trial_ends_at) : "—"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sucursales</CardDescription>
            <CardTitle className="text-2xl">{branchesCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clientes</CardDescription>
            <CardTitle className="text-2xl">{customersCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Equipo</CardDescription>
            <CardTitle className="text-2xl">{staffCount ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <p className="text-sm">
              {(subscription.plans as unknown as { name: string } | null)?.name} — {subscription.status}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">Sin suscripción activa.</p>
          )}
        </CardContent>
      </Card>

      <SuspendButton orgId={org.id} status={org.status} />
    </div>
  );
}
