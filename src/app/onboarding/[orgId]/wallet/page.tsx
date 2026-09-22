import Link from "next/link";
import { notFound } from "next/navigation";
import { Stamp } from "lucide-react";
import { OnboardingStepper } from "@/components/onboarding/stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { loadOnboardingOrg } from "../../shared";

export default async function OnboardingWalletPreviewPage({
  params,
  searchParams,
}: PageProps<"/onboarding/[orgId]/wallet">) {
  const { orgId } = await params;
  const { programId } = await searchParams;
  const org = await loadOnboardingOrg(orgId);

  const supabase = await createClient();
  const { data: program } = await supabase
    .from("programs")
    .select("id, name, type, reward_headline")
    .eq("id", String(programId))
    .eq("organization_id", orgId)
    .single();

  if (!program) notFound();

  const { data: rules } = await supabase
    .from("program_rules")
    .select("stamps_required")
    .eq("program_id", program.id)
    .single();

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <OnboardingStepper current="wallet" />
      <Card>
        <CardHeader>
          <CardTitle>Así se verá la tarjeta de tus clientes</CardTitle>
          <CardDescription>
            Vista previa. El diseño final puede variar ligeramente según Apple Wallet o Google Wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl shadow-lg"
            style={{ backgroundColor: org.brand_primary_color, color: org.brand_secondary_color }}
          >
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-2">
                {org.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={org.logo_url} alt={org.name} className="h-8 w-8 rounded object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-white/20">
                    <Stamp className="h-4 w-4" />
                  </div>
                )}
                <span className="text-sm font-semibold">{org.name}</span>
              </div>
            </div>
            <div className="space-y-1 px-4 pb-2">
              <p className="text-xs uppercase tracking-wide opacity-80">{program.name}</p>
              <p className="text-2xl font-bold">
                {program.type === "STAMPS" ? `0 / ${rules?.stamps_required ?? "–"} sellos` : "0 puntos"}
              </p>
            </div>
            <div className="flex gap-1.5 px-4 pb-4">
              {program.type === "STAMPS" &&
                Array.from({ length: Math.min(rules?.stamps_required ?? 10, 10) }).map((_, i) => (
                  <div key={i} className="h-4 w-4 rounded-full border-2 border-current opacity-60" />
                ))}
            </div>
            <div className="border-t border-white/20 px-4 py-3 text-xs opacity-90">
              Próxima recompensa: {program.reward_headline}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Las tarjetas se emiten en modo de prueba hasta que configures tus credenciales de Apple
            Wallet y Google Wallet (ver Configuración → Wallet).
          </p>

          <Button className="w-full" asChild>
            <Link href={`/onboarding/${orgId}/qr?programId=${program.id}`}>Continuar</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
