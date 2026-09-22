import { requireUser } from "@/lib/authz/session";
import { OnboardingStepper } from "@/components/onboarding/stepper";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BusinessInfoForm } from "./business-info-form";

export default async function OnboardingStartPage() {
  await requireUser();

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <OnboardingStepper current="negocio" />
      <Card>
        <CardHeader>
          <CardTitle>Cuéntanos de tu negocio</CardTitle>
          <CardDescription>
            Esta información aparecerá en tu tarjeta de lealtad y en la página de registro de clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessInfoForm />
        </CardContent>
      </Card>
    </div>
  );
}
