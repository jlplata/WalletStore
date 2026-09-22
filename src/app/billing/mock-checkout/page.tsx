import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/authz/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { activateMockPlanAction } from "./actions";

export default async function MockCheckoutPage({
  searchParams,
}: PageProps<"/billing/mock-checkout">) {
  await requireUser();
  const { organizationId, plan: planCode, returnTo } = await searchParams;

  if (typeof organizationId !== "string" || typeof planCode !== "string" || typeof returnTo !== "string") {
    notFound();
  }

  const admin = createAdminClient();
  const { data: plan } = await admin
    .from("plans")
    .select("name, price_monthly_cents, currency")
    .eq("code", planCode)
    .single();

  if (!plan) notFound();

  const activate = activateMockPlanAction.bind(null, organizationId, planCode, returnTo);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4">
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> Modo de prueba — no se realizará ningún cargo real
      </Badge>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Confirmar plan {plan.name}</CardTitle>
          <CardDescription>
            {formatCurrency(plan.price_monthly_cents, plan.currency)} /mes. Esto es una simulación:
            configura Stripe (ver docs/billing.md) para procesar pagos reales.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={activate}>
            <Button type="submit" className="w-full">
              Activar plan de prueba
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
