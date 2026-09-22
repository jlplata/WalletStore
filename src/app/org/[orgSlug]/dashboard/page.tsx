import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Fleshed out with real KPIs in Fase 6 (Analytics). For now this confirms
// the authenticated app shell + org-scoped routing work end to end.
export default async function OrgDashboardPage({
  params,
}: PageProps<"/org/[orgSlug]/dashboard">) {
  const { orgSlug } = await params;

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Panel de {orgSlug}. Las métricas en tiempo real llegan en la Fase 6.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Clientes registrados", "Transacciones (30d)", "Recompensas canjeadas", "Clientes activos"].map(
          (label) => (
            <Card key={label}>
              <CardHeader>
                <CardDescription>{label}</CardDescription>
                <CardTitle className="text-3xl">—</CardTitle>
              </CardHeader>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
