"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOrgRole } from "@/lib/authz/session";
import { getEmailProvider } from "@/lib/email";
import type { MemberRole } from "@/lib/supabase/database.types";

export type TeamFormState = { error?: string };

const inviteSchema = z.object({
  email: z.string().email("Correo inválido."),
  role: z.enum(["ORGANIZATION_ADMIN", "BRANCH_MANAGER", "CASHIER"]),
});

export async function inviteMemberAction(
  orgId: string,
  orgSlug: string,
  _prevState: TeamFormState,
  formData: FormData
): Promise<TeamFormState> {
  await requireOrgRole(orgId, "team.invite");

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();

  const { data: org } = await supabase.from("organizations").select("name").eq("id", orgId).single();

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      organization_id: orgId,
      email: parsed.data.email,
      role: parsed.data.role as MemberRole,
    })
    .select("token")
    .single();

  if (error || !invitation) {
    return {
      error:
        error?.code === "23505"
          ? "Ya existe una invitación pendiente para este correo."
          : error?.message ?? "No se pudo crear la invitación.",
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/invite/${invitation.token}`;

  await getEmailProvider().send({
    to: parsed.data.email,
    subject: `Te invitaron a unirte a ${org?.name ?? "un negocio"} en WalletStore`,
    html: `<p>Te invitaron a colaborar en <strong>${org?.name}</strong>.</p><p><a href="${inviteUrl}">Aceptar invitación</a></p><p>Este enlace expira en 7 días.</p>`,
  });

  revalidatePath(`/org/${orgSlug}/team`);
  return {};
}

export async function revokeInvitationAction(orgId: string, orgSlug: string, invitationId: string) {
  await requireOrgRole(orgId, "team.invite");
  const supabase = await createClient();
  await supabase
    .from("invitations")
    .update({ status: "REVOKED" })
    .eq("id", invitationId)
    .eq("organization_id", orgId);
  revalidatePath(`/org/${orgSlug}/team`);
}

export async function updateMemberRoleAction(
  orgId: string,
  orgSlug: string,
  memberId: string,
  role: MemberRole
) {
  await requireOrgRole(orgId, "team.invite");
  const supabase = await createClient();
  await supabase
    .from("organization_members")
    .update({ role })
    .eq("id", memberId)
    .eq("organization_id", orgId);
  revalidatePath(`/org/${orgSlug}/team`);
}

export async function removeMemberAction(orgId: string, orgSlug: string, memberId: string) {
  const membership = await requireOrgRole(orgId, "team.remove");

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("organization_members")
    .select("role, user_id")
    .eq("id", memberId)
    .eq("organization_id", orgId)
    .single();

  if (target?.role === "ORGANIZATION_OWNER" && !membership.isPlatformAdmin) {
    throw new Error("No puedes remover al dueño de la organización.");
  }

  await supabase.from("organization_members").delete().eq("id", memberId).eq("organization_id", orgId);
  revalidatePath(`/org/${orgSlug}/team`);
}

// Uses the admin client only to resolve auth user emails for display (the
// `profiles` table doesn't store email; auth.users is not directly
// queryable via the anon/authenticated RLS-bound client).
export async function getMemberEmails(userIds: string[]) {
  if (userIds.length === 0) return {} as Record<string, string>;
  const admin = createAdminClient();
  const result: Record<string, string> = {};
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data?.user?.email) result[id] = data.user.email;
    })
  );
  return result;
}
