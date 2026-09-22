import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { resolveOrgForAction } from "@/lib/org/resolve";
import { BranchDialog } from "./branch-dialog";
import { ToggleActiveButton } from "./toggle-active-button";

export default async function BranchesPage({
  params,
}: PageProps<"/org/[orgSlug]/branches">) {
  const { orgSlug } = await params;
  const { org } = await resolveOrgForAction(orgSlug, "branch.manage");

  const supabase = await createClient();
  const { data: branches } = await supabase
    .from("branches")
    .select("id, name, address, latitude, longitude, phone, is_active")
    .eq("organization_id", org.id)
    .order("created_at");

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sucursales</h1>
          <p className="text-sm text-muted-foreground">Administra las ubicaciones de tu negocio.</p>
        </div>
        <BranchDialog orgId={org.id} orgSlug={org.slug} />
      </div>

      <Card>
        <CardContent className="p-0">
          {branches && branches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.name}</TableCell>
                    <TableCell className="text-muted-foreground">{b.address || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{b.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={b.is_active ? "success" : "secondary"}>
                        {b.is_active ? "Activa" : "Suspendida"}
                      </Badge>
                    </TableCell>
                    <TableCell className="flex justify-end gap-1">
                      <BranchDialog orgId={org.id} orgSlug={org.slug} branch={b} />
                      <ToggleActiveButton
                        orgId={org.id}
                        orgSlug={org.slug}
                        branchId={b.id}
                        isActive={b.is_active}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Aún no tienes sucursales. Crea la primera con el botón de arriba.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
