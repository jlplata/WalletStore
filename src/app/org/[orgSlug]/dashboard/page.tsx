import Link from "next/link";
import {
  Users,
  UserPlus,
  Activity,
  Receipt,
  Gift,
  Award,
  DollarSign,
  UserX,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart } from "@/components/app/bar-chart";
import { resolveOrgForAction } from "@/lib/org/resolve";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

const PERIODS = [
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
];

export default async function OrgDashboardPage({
  params,
  searchParams,
}: PageProps<"/org/[orgSlug]/dashboard">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const { org } = await resolveOrgForAction(orgSlug, "report.view");

  const days = Number(typeof sp.period === "string" ? sp.period : "30") || 30;
  const periodEnd = new Date();
  const periodStart = new Date();
  periodStart.setDate(periodStart.getDate() - days);

  const supabase = await createClient();
  const [{ data: metricsRows }, { data: dailyRows }, { data: hasPrograms }] = await Promise.all([
    supabase.rpc("org_dashboard_metrics", {
      p_organization_id: org.id,
      p_period_start: periodStart.toISOString(),
      p_period_end: periodEnd.toISOString(),
    }),
    supabase.rpc("org_daily_transactions", {
      p_organization_id: org.id,
      p_period_start: periodStart.toISOString(),
      p_period_end: periodEnd.toISOString(),
    }),
    supabase.from("programs").select("id").eq("organization_id", org.id).limit(1),
  ]);

  const metrics = metricsRows?.[0];
  const hasAnyProgram = (hasPrograms?.length ?? 0) > 0;

  if (!hasAnyProgram) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="text-2xl font-semibold">¡Bienvenido a {org.name}!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Crea tu primer programa de lealtad para empezar a ver métricas aquí.
        </p>
        <Button className="mt-6" asChild>
          <Link href={`/org/${org.slug}/programs`}>Crear programa</Link>
        </Button>
      </div>
    );
  }

  const redemptionRate =
    metrics && metrics.rewards_unlocked > 0
      ? Math.round((metrics.rewards_redeemed / metrics.rewards_unlocked) * 100)
      : 0;

  const kpis = [
    { label: "Clientes registrados", value: metrics?.customers_total ?? 0, icon: Users },
    { label: "Clientes nuevos", value: metrics?.customers_new ?? 0, icon: UserPlus },
    { label: "Clientes activos", value: metrics?.customers_active ?? 0, icon: Activity },
    { label: "Transacciones", value: metrics?.transactions_count ?? 0, icon: Receipt },
    {
      label: "Valor de compras",
      value: formatCurrency(metrics?.revenue_cents ?? 0, org.currency),
      icon: DollarSign,
    },
    { label: "Recompensas emitidas", value: metrics?.rewards_unlocked ?? 0, icon: Gift },
    { label: "Recompensas canjeadas", value: metrics?.rewards_redeemed ?? 0, icon: Award },
    { label: "Tasa de canje", value: `${redemptionRate}%`, icon: Award },
    { label: "Clientes inactivos (30d)", value: metrics?.customers_inactive_30 ?? 0, icon: UserX },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Resumen de {org.name}.</p>
        </div>
        <div className="flex gap-1 rounded-md border p-1">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={String(days) === p.value ? "default" : "ghost"}
              asChild
            >
              <Link href={`/org/${org.slug}/dashboard?period=${p.value}`}>{p.label}</Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transacciones por día</CardTitle>
          <CardDescription>Últimos {days} días.</CardDescription>
        </CardHeader>
        <CardContent>
          <BarChart data={dailyRows ?? []} labelKey="day" valueKey="transactions_count" />
        </CardContent>
      </Card>
    </div>
  );
}
