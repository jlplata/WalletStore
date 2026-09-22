import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { PartyPopper } from "lucide-react";
import { OnboardingStepper } from "@/components/onboarding/stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { loadOnboardingOrg } from "../../shared";
import { finishOnboardingAction } from "../../actions";
import { QrDownloadCard } from "./qr-download-card";

export default async function OnboardingQrPage({
  params,
  searchParams,
}: PageProps<"/onboarding/[orgId]/qr">) {
  const { orgId } = await params;
  const { programId } = await searchParams;
  await loadOnboardingOrg(orgId);

  const supabase = await createClient();
  const { data: program } = await supabase
    .from("programs")
    .select("id, name")
    .eq("id", String(programId))
    .eq("organization_id", orgId)
    .single();

  if (!program) notFound();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const joinUrl = `${appUrl}/join/${program.id}`;
  const qrDataUrl = await QRCode.toDataURL(joinUrl, { width: 480, margin: 2 });

  const finish = finishOnboardingAction.bind(null, orgId);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <OnboardingStepper current="qr" />
      <Card>
        <CardHeader className="items-center text-center">
          <PartyPopper className="h-8 w-8 text-brand" />
          <CardTitle className="mt-2">Tu programa está listo</CardTitle>
          <CardDescription>
            Comparte este QR con tus clientes para que se registren en {program.name}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <QrDownloadCard qrDataUrl={qrDataUrl} joinUrl={joinUrl} programName={program.name} />
          <form action={finish}>
            <Button type="submit" className="w-full">
              Ir a mi panel
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
