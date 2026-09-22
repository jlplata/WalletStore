"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { removeMemberAction, revokeInvitationAction, updateMemberRoleAction } from "./actions";
import type { MemberRole } from "@/lib/supabase/database.types";

const ROLE_OPTIONS: { value: MemberRole; label: string }[] = [
  { value: "ORGANIZATION_OWNER", label: "Dueño" },
  { value: "ORGANIZATION_ADMIN", label: "Administrador" },
  { value: "BRANCH_MANAGER", label: "Gerente de sucursal" },
  { value: "CASHIER", label: "Cajero" },
];

export function MemberRoleSelect({
  orgId,
  orgSlug,
  memberId,
  role,
  disabled,
}: {
  orgId: string;
  orgSlug: string;
  memberId: string;
  role: MemberRole;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={role}
      disabled={disabled || pending}
      onValueChange={(value) =>
        startTransition(() => updateMemberRoleAction(orgId, orgSlug, memberId, value as MemberRole))
      }
    >
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLE_OPTIONS.filter((r) => r.value !== "ORGANIZATION_OWNER" || role === "ORGANIZATION_OWNER").map(
          (r) => (
            <SelectItem key={r.value} value={r.value} disabled={r.value === "ORGANIZATION_OWNER"}>
              {r.label}
            </SelectItem>
          )
        )}
      </SelectContent>
    </Select>
  );
}

export function RemoveMemberButton({
  orgId,
  orgSlug,
  memberId,
  disabled,
}: {
  orgId: string;
  orgSlug: string;
  memberId: string;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await removeMemberAction(orgId, orgSlug, memberId);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "No se pudo remover.");
          }
        })
      }
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export function RevokeInvitationButton({
  orgId,
  orgSlug,
  invitationId,
}: {
  orgId: string;
  orgSlug: string;
  invitationId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => revokeInvitationAction(orgId, orgSlug, invitationId))}
    >
      Revocar
    </Button>
  );
}
