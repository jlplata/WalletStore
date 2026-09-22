import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { resolveOrgForAction } from "@/lib/org/resolve";
import { InviteDialog } from "./invite-dialog";
import { MemberRoleSelect, RemoveMemberButton, RevokeInvitationButton } from "./member-actions";
import { getMemberEmails } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  ORGANIZATION_OWNER: "Dueño",
  ORGANIZATION_ADMIN: "Administrador",
  BRANCH_MANAGER: "Gerente de sucursal",
  CASHIER: "Cajero",
};

export default async function TeamPage({ params }: PageProps<"/org/[orgSlug]/team">) {
  const { orgSlug } = await params;
  const { org, membership } = await resolveOrgForAction(orgSlug, "team.invite");

  const supabase = await createClient();
  const [{ data: members }, { data: invitations }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("id, user_id, role, created_at")
      .eq("organization_id", org.id)
      .order("created_at"),
    supabase
      .from("invitations")
      .select("id, email, role, status, expires_at")
      .eq("organization_id", org.id)
      .eq("status", "PENDING")
      .order("created_at", { ascending: false }),
  ]);

  const emails = await getMemberEmails((members ?? []).map((m) => m.user_id));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipo</h1>
          <p className="text-sm text-muted-foreground">Administra quién tiene acceso a tu negocio.</p>
        </div>
        <InviteDialog orgId={org.id} orgSlug={org.slug} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Miembros</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(members ?? []).map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{emails[m.user_id] ?? m.user_id}</TableCell>
                  <TableCell>
                    <MemberRoleSelect
                      orgId={org.id}
                      orgSlug={org.slug}
                      memberId={m.id}
                      role={m.role}
                      disabled={!membership.isPlatformAdmin && membership.role !== "ORGANIZATION_OWNER" && m.role === "ORGANIZATION_OWNER"}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {m.role !== "ORGANIZATION_OWNER" && (
                      <RemoveMemberButton orgId={org.id} orgSlug={org.slug} memberId={m.id} />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {invitations && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invitaciones pendientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Correo</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Expira</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ROLE_LABELS[inv.role]}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(inv.expires_at).toLocaleDateString("es-MX")}
                    </TableCell>
                    <TableCell className="text-right">
                      <RevokeInvitationButton orgId={org.id} orgSlug={org.slug} invitationId={inv.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
