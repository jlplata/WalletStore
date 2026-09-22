import { OnboardingStepper } from "@/components/onboarding/stepper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadOnboardingOrg } from "../../shared";
import { BrandingForm } from "./branding-form";

export default async function BrandingPage({
  params,
}: PageProps<"/onboarding/[orgId]/marca">) {
  const { orgId } = await params;
  const org = await loadOnboardingOrg(orgId);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <OnboardingStepper current="marca" />
      <Card>
        <CardHeader>
          <CardTitle>Personaliza tu marca</CardTitle>
          <CardDescription>
            Estos colores y logo se usarán en tu tarjeta digital y en la página de registro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandingForm orgId={org.id} defaultValues={org} />
        </CardContent>
      </Card>
    </div>
  );
}
