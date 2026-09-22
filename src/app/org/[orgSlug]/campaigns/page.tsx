import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { resolveOrgForAction } from "@/lib/org/resolve";
import { formatDateTime } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  PROMOTION: "Promoción",
  BIRTHDAY: "Cumpleaños",
  WIN_BACK: "Reactivación",
  BONUS_POINTS: "Puntos extra",
  DOUBLE_STAMPS: "Sellos dobles",
  CUSTOM: "Personalizada",
};

export default async function CampaignsPage({ params }: PageProps<"/org/[orgSlug]/campaigns">) {
  const { orgSlug } = await params;
  const { org } = await resolveOrgForAction(orgSlug, "campaign.manage");

  const supabase = await createClient();
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, name, type, status, audience_segment, sent_at, created_at")
    .eq("organization_id", org.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campañas</h1>
          <p className="text-sm text-muted-foreground">Reactiva clientes y promueve tu programa por correo.</p>
        </div>
        <Button asChild>
          <Link href={`/org/${org.slug}/campaigns/new`}>
            <Plus className="h-4 w-4" /> Nueva campaña
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {campaigns && campaigns.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Audiencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer">
                    <TableCell className="font-medium">
                      <Link href={`/org/${org.slug}/campaigns/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>{TYPE_LABELS[c.type]}</TableCell>
                    <TableCell className="text-muted-foreground">{c.audience_segment}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "SENT" ? "success" : "secondary"}>{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(c.sent_at ?? c.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Aún no has enviado campañas.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
