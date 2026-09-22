import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { resolveOrgForAction } from "@/lib/org/resolve";
import { GeneralForm } from "./general-form";
import { BrandingSettingsForm } from "./branding-settings-form";

export default async function SettingsPage({ params }: PageProps<"/org/[orgSlug]/settings">) {
  const { orgSlug } = await params;
  const { org } = await resolveOrgForAction(orgSlug, "organization.update");

  const supabase = await createClient();
  const { data: fullOrg } = await supabase
    .from("organizations")
    .select("name, phone, email, website, brand_primary_color, brand_secondary_color, logo_url")
    .eq("id", org.id)
    .single();

  if (!fullOrg) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información general</CardTitle>
          <CardDescription>Datos de contacto de tu negocio.</CardDescription>
        </CardHeader>
        <CardContent>
          <GeneralForm orgId={org.id} orgSlug={org.slug} defaultValues={fullOrg} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Marca</CardTitle>
          <CardDescription>Se usa en tu tarjeta Wallet y página de registro.</CardDescription>
        </CardHeader>
        <CardContent>
          <BrandingSettingsForm orgId={org.id} orgSlug={org.slug} defaultValues={fullOrg} />
        </CardContent>
      </Card>
    </div>
  );
}
