"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateGeneralSettingsAction, type SettingsFormState } from "./actions";

const initialState: SettingsFormState = {};

export function GeneralForm({
  orgId,
  orgSlug,
  defaultValues,
}: {
  orgId: string;
  orgSlug: string;
  defaultValues: { name: string; phone: string | null; email: string | null; website: string | null };
}) {
  const action = updateGeneralSettingsAction.bind(null, orgId, orgSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.success) toast.success("Cambios guardados.");
  }, [state.success]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre comercial *</Label>
        <Input id="name" name="name" required defaultValue={defaultValues.name} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" defaultValue={defaultValues.phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" defaultValue={defaultValues.email ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="website">Sitio web</Label>
        <Input id="website" name="website" type="url" defaultValue={defaultValues.website ?? ""} />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
