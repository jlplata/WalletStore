import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { resolveOrgForAction } from "@/lib/org/resolve";
import { GeneralForm } from "./general-form";
import { BrandingSettingsForm } from "./branding-settings-form";
import { WebhookDialog } from "./webhook-dialog";
import { WebhookRowActions } from "./webhook-row-actions";

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

  const { data: webhooks } = await supabase
    .from("webhooks")
    .select("id, url, event_types, is_active")
    .eq("organization_id", org.id)
    .order("created_at");

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

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Webhooks</CardTitle>
            <CardDescription>Automatiza flujos externos (compatible con n8n) cuando ocurran eventos.</CardDescription>
          </div>
          <WebhookDialog orgId={org.id} orgSlug={org.slug} />
        </CardHeader>
        <CardContent className="space-y-3">
          {webhooks && webhooks.length > 0 ? (
            webhooks.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{w.url}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {w.event_types.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
                <WebhookRowActions orgId={org.id} orgSlug={org.slug} webhookId={w.id} isActive={w.is_active} />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Sin webhooks configurados.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
