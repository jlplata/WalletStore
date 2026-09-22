import { OnboardingStepper } from "@/components/onboarding/stepper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadOnboardingOrg } from "../../shared";
import { ProgramForm } from "./program-form";

export default async function OnboardingProgramPage({
  params,
}: PageProps<"/onboarding/[orgId]/programa">) {
  const { orgId } = await params;
  await loadOnboardingOrg(orgId);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <OnboardingStepper current="programa" />
      <Card>
        <CardHeader>
          <CardTitle>Tu programa de lealtad</CardTitle>
          <CardDescription>
            Elige cómo tus clientes ganarán recompensas: por sellos (visitas) o por puntos (gasto).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProgramForm orgId={orgId} />
        </CardContent>
      </Card>
    </div>
  );
}
