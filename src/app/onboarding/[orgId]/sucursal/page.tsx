import { OnboardingStepper } from "@/components/onboarding/stepper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadOnboardingOrg } from "../../shared";
import { BranchForm } from "./branch-form";

export default async function OnboardingBranchPage({
  params,
}: PageProps<"/onboarding/[orgId]/sucursal">) {
  const { orgId } = await params;
  await loadOnboardingOrg(orgId);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <OnboardingStepper current="sucursal" />
      <Card>
        <CardHeader>
          <CardTitle>Tu primera sucursal</CardTitle>
          <CardDescription>
            Podrás agregar más sucursales después desde el panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BranchForm orgId={orgId} />
        </CardContent>
      </Card>
    </div>
  );
}
