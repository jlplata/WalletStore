"use client";

import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { inviteMemberAction, type TeamFormState } from "./actions";

const initialState: TeamFormState = {};

const ROLE_OPTIONS = [
  { value: "ORGANIZATION_ADMIN", label: "Administrador" },
  { value: "BRANCH_MANAGER", label: "Gerente de sucursal" },
  { value: "CASHIER", label: "Cajero" },
];

export function InviteDialog({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const [open, setOpen] = useState(false);
  const action = inviteMemberAction.bind(null, orgId, orgSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" /> Invitar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar a tu equipo</DialogTitle>
          <DialogDescription>Enviaremos un enlace de invitación por correo, válido por 7 días.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await formAction(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Correo *</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Rol *</Label>
            <Select name="role" required defaultValue="CASHIER">
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Enviando..." : "Enviar invitación"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
