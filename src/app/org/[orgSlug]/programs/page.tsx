import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { resolveOrgForAction } from "@/lib/org/resolve";
import { ProgramDialog } from "./program-dialog";
import { ToggleProgramActiveButton, ProgramQrDialog } from "./program-row-actions";

export default async function ProgramsPage({ params }: PageProps<"/org/[orgSlug]/programs">) {
  const { orgSlug } = await params;
  const { org } = await resolveOrgForAction(orgSlug, "program.manage");

  const supabase = await createClient();
  const { data: programs } = await supabase
    .from("programs")
    .select("id, name, type, reward_headline, is_active")
    .eq("organization_id", org.id)
    .order("created_at");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Programas de lealtad</h1>
          <p className="text-sm text-muted-foreground">Sellos, puntos y sus recompensas.</p>
        </div>
        <ProgramDialog orgId={org.id} orgSlug={org.slug} />
      </div>

      <Card>
        <CardContent className="p-0">
          {programs && programs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Programa</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Recompensa principal</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.type === "STAMPS" ? "Sellos" : "Puntos"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.reward_headline}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "success" : "secondary"}>
                        {p.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-1">
                      <ProgramQrDialog joinUrl={`${appUrl}/join/${p.id}`} programName={p.name} />
                      <ToggleProgramActiveButton
                        orgId={org.id}
                        orgSlug={org.slug}
                        programId={p.id}
                        isActive={p.is_active}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Aún no tienes programas. Crea el primero con el botón de arriba.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
