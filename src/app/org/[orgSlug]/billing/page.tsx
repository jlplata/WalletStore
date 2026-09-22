import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { resolveOrgForAction } from "@/lib/org/resolve";
import { getBillingProvider } from "@/lib/billing";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CheckoutButton, PortalButton } from "./billing-buttons";

export default async function BillingPage({
  params,
  searchParams,
}: PageProps<"/org/[orgSlug]/billing">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const { org } = await resolveOrgForAction(orgSlug, "organization.billing.manage");

  const supabase = await createClient();
  const [{ data: subscription }, { data: plans }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select("*, plans(code, name)")
      .eq("organization_id", org.id)
      .maybeSingle(),
    supabase.from("plans").select("*, plan_features(key, value)").eq("is_active", true).order("sort_order"),
  ]);

  const currentPlanCode = (subscription?.plans as unknown as { code: string } | null)?.code;
  const billingProvider = getBillingProvider();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Facturación</h1>
        <p className="text-sm text-muted-foreground">Administra tu plan y método de pago.</p>
      </div>

      {billingProvider.mode === "mock" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Modo de prueba: no hay claves de Stripe configuradas, así que ningún cargo es real. Ver
          docs/billing.md para conectar Stripe.
        </div>
      )}
      {sp.portal === "mock" && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          El portal de administración de pagos requiere Stripe configurado.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado actual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {subscription ? (
            <>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="font-medium">
                  {(subscription.plans as unknown as { name: string } | null)?.name}
                </span>
                <Badge variant={subscription.status === "ACTIVE" ? "success" : "secondary"}>
                  {subscription.status}
                </Badge>
              </div>
              {subscription.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  Renueva el {formatDate(subscription.current_period_end)}
                </p>
              )}
              <PortalButton orgId={org.id} orgSlug={org.slug} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Sin plan activo. Tu organización está en{" "}
              <Badge variant="secondary">{org.status ?? "prueba"}</Badge>.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {(plans ?? []).map((plan) => {
          const features = plan.plan_features as unknown as { key: string; value: unknown }[];
          const branchesLimit = features.find((f) => f.key === "branches_limit")?.value;
          const staffLimit = features.find((f) => f.key === "staff_limit")?.value;
          const campaignsEnabled = features.find((f) => f.key === "campaigns_enabled")?.value;

          return (
            <Card key={plan.id} className={currentPlanCode === plan.code ? "border-primary" : ""}>
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-2xl font-bold">
                  {formatCurrency(plan.price_monthly_cents, plan.currency)}
                  <span className="text-sm font-normal text-muted-foreground">/mes</span>
                </p>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>{String(branchesLimit)} sucursales</li>
                  <li>{String(staffLimit)} miembros de equipo</li>
                  <li>{campaignsEnabled === true ? "Campañas incluidas" : "Sin campañas"}</li>
                </ul>
                {currentPlanCode === plan.code ? (
                  <Badge>Plan actual</Badge>
                ) : (
                  <CheckoutButton orgId={org.id} orgSlug={org.slug} planCode={plan.code} />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
