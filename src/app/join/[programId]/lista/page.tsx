import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletButtons } from "./wallet-buttons";

export default async function JoinReadyPage({
  params,
  searchParams,
}: PageProps<"/join/[programId]/lista">) {
  const { programId } = await params;
  const { token } = await searchParams;
  if (typeof token !== "string") notFound();

  const admin = createAdminClient();
  const { data: customer } = await admin
    .from("customers")
    .select("id, first_name")
    .eq("qr_token", token)
    .maybeSingle();

  if (!customer) notFound();

  const { data: program } = await admin
    .from("programs")
    .select("name, type, organizations(name)")
    .eq("id", programId)
    .maybeSingle();

  if (!program) notFound();
  const org = program.organizations as unknown as { name: string } | null;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
      <CheckCircle2 className="h-12 w-12 text-emerald-500" />
      <div>
        <h1 className="text-2xl font-bold">Tu tarjeta está lista</h1>
        <p className="mt-1 text-muted-foreground">
          ¡Bienvenido/a {customer.first_name}! Agrega tu tarjeta de {org?.name} a tu teléfono.
        </p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">{program.name}</CardTitle>
          <CardDescription>Escanea tu QR en cada visita para acumular {program.type === "STAMPS" ? "sellos" : "puntos"}.</CardDescription>
        </CardHeader>
        <CardContent>
          <WalletButtons customerId={customer.id} programId={programId} />
        </CardContent>
      </Card>
    </div>
  );
}
