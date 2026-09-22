import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { resolveOrgForAction } from "@/lib/org/resolve";
import { RewardDialog } from "./reward-dialog";
import { ToggleRewardButton } from "./toggle-reward-button";

const TYPE_LABELS: Record<string, string> = {
  FREE_ITEM: "Producto gratis",
  DISCOUNT_FIXED: "Descuento fijo",
  DISCOUNT_PERCENTAGE: "Descuento %",
  CUSTOM: "Personalizado",
};

export default async function RewardsPage({ params }: PageProps<"/org/[orgSlug]/rewards">) {
  const { orgSlug } = await params;
  const { org } = await resolveOrgForAction(orgSlug, "reward.manage");

  const supabase = await createClient();
  const [{ data: programs }, { data: rewards }] = await Promise.all([
    supabase.from("programs").select("id, name, type").eq("organization_id", org.id).eq("is_active", true),
    supabase
      .from("rewards")
      .select("id, name, type, cost_stamps, cost_points, is_active, programs(name)")
      .eq("organization_id", org.id)
      .order("created_at"),
  ]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recompensas</h1>
          <p className="text-sm text-muted-foreground">
            {programs?.length ? "Configura qué gana cada cliente." : "Crea un programa primero para agregar recompensas."}
          </p>
        </div>
        <RewardDialog orgId={org.id} orgSlug={org.slug} programs={programs ?? []} />
      </div>

      <Card>
        <CardContent className="p-0">
          {rewards && rewards.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recompensa</TableHead>
                  <TableHead>Programa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards.map((r) => {
                  const program = r.programs as unknown as { name: string } | null;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-muted-foreground">{program?.name ?? "—"}</TableCell>
                      <TableCell>{TYPE_LABELS[r.type]}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {r.cost_stamps ? `${r.cost_stamps} sellos` : r.cost_points ? `${r.cost_points} pts` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.is_active ? "success" : "secondary"}>
                          {r.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <ToggleRewardButton orgId={org.id} orgSlug={org.slug} rewardId={r.id} isActive={r.is_active} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Aún no tienes recompensas configuradas.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
