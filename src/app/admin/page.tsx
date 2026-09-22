import { Building2, Users, CreditCard, Receipt, Wallet, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: orgsTotal },
    { count: orgsActive },
    { count: orgsTrial },
    { count: customersTotal },
    { count: transactionsTotal },
    { count: walletPassesTotal },
    { count: walletPassesLive },
    { data: activeSubs },
  ] = await Promise.all([
    supabase.from("organizations").select("id", { count: "exact", head: true }),
    supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "TRIAL"),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase.from("purchase_transactions").select("id", { count: "exact", head: true }),
    supabase.from("wallet_passes").select("id", { count: "exact", head: true }),
    supabase.from("wallet_passes").select("id", { count: "exact", head: true }).eq("provider_mode", "LIVE"),
    supabase.from("subscriptions").select("plans(price_monthly_cents)").eq("status", "ACTIVE"),
  ]);

  const mrrCents = (activeSubs ?? []).reduce((sum, s) => {
    const plan = s.plans as unknown as { price_monthly_cents: number } | null;
    return sum + (plan?.price_monthly_cents ?? 0);
  }, 0);

  const kpis = [
    { label: "Organizaciones totales", value: orgsTotal ?? 0, icon: Building2 },
    { label: "Organizaciones activas", value: orgsActive ?? 0, icon: Building2 },
    { label: "En prueba (trial)", value: orgsTrial ?? 0, icon: Building2 },
    { label: "MRR estimado", value: formatCurrency(mrrCents), icon: TrendingUp },
    { label: "Clientes finales totales", value: customersTotal ?? 0, icon: Users },
    { label: "Transacciones totales", value: transactionsTotal ?? 0, icon: Receipt },
    { label: "Wallet passes emitidos", value: walletPassesTotal ?? 0, icon: Wallet },
    { label: "Wallet passes reales (no prueba)", value: walletPassesLive ?? 0, icon: CreditCard },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard de plataforma</h1>
        <p className="text-sm text-muted-foreground">Métricas globales de todas las organizaciones.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{kpi.label}</CardDescription>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        El MRR se calcula sumando el precio mensual de las suscripciones con estado ACTIVE — incluye
        suscripciones en modo de prueba (sin cargo real) si el negocio aún no configuró Stripe.
      </p>
    </div>
  );
}
