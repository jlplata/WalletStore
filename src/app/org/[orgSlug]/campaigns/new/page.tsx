import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { resolveOrgForAction } from "@/lib/org/resolve";
import { CampaignForm } from "./campaign-form";

export default async function NewCampaignPage({ params }: PageProps<"/org/[orgSlug]/campaigns/new">) {
  const { orgSlug } = await params;
  const { org } = await resolveOrgForAction(orgSlug, "campaign.manage");

  const supabase = await createClient();
  const { data: programs } = await supabase
    .from("programs")
    .select("id, name")
    .eq("organization_id", org.id)
    .eq("is_active", true);

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Nueva campaña</CardTitle>
          <CardDescription>
            Se envía por correo a los clientes de la audiencia que tengan correo registrado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignForm orgId={org.id} orgSlug={org.slug} programs={programs ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
