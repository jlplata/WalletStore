import { resolveOrgForAction } from "@/lib/org/resolve";
import { getAssignableBranches } from "./actions";
import { PosScreen } from "./pos-screen";

export default async function PosPage({ params }: PageProps<"/org/[orgSlug]/pos">) {
  const { orgSlug } = await params;
  const { org } = await resolveOrgForAction(orgSlug, "purchase.record");
  const branches = await getAssignableBranches(org.id);

  if (branches.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center text-sm text-muted-foreground">
        No tienes ninguna sucursal activa asignada. Pide a un administrador que te asigne una.
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-center text-2xl font-semibold tracking-tight">Modo caja</h1>
      <PosScreen orgId={org.id} branches={branches} />
    </div>
  );
}
