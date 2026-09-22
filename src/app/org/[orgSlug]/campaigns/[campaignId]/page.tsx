import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { resolveOrgForAction } from "@/lib/org/resolve";
import { formatDateTime } from "@/lib/utils";

export default async function CampaignDetailPage({
  params,
}: PageProps<"/org/[orgSlug]/campaigns/[campaignId]">) {
  const { orgSlug, campaignId } = await params;
  const { org } = await resolveOrgForAction(orgSlug, "campaign.manage");

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*, programs(name)")
    .eq("id", campaignId)
    .eq("organization_id", org.id)
    .single();

  if (!campaign) notFound();

  const { data: deliveries } = await supabase
    .from("campaign_deliveries")
    .select("status")
    .eq("campaign_id", campaignId);

  const sent = deliveries?.filter((d) => d.status === "SENT").length ?? 0;
  const failed = deliveries?.filter((d) => d.status === "FAILED").length ?? 0;
  const { count: audienceCount } = await supabase
    .from("campaign_audiences")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  const program = campaign.programs as unknown as { name: string } | null;
  const skipped = (audienceCount ?? 0) - sent - failed;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
        <p className="text-sm text-muted-foreground">
          {program?.name} · Audiencia: {campaign.audience_segment} ·{" "}
          {campaign.sent_at ? formatDateTime(campaign.sent_at) : "Sin enviar"}
        </p>
        <Badge className="mt-2" variant={campaign.status === "SENT" ? "success" : "secondary"}>
          {campaign.status}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Enviados</CardDescription>
            <CardTitle className="text-2xl">{sent}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Fallidos</CardDescription>
            <CardTitle className="text-2xl">{failed}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Sin correo</CardDescription>
            <CardTitle className="text-2xl">{Math.max(skipped, 0)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mensaje</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm font-medium">{campaign.subject}</p>
          <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{campaign.message}</p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Solo se muestran los resultados que el proveedor de correo confirma al enviar (entregado/fallido).
        No se reportan aperturas ni clics porque el proveedor configurado no los expone.
      </p>
    </div>
  );
}
