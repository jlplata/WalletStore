"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createBranchAction, type OnboardingFormState } from "../../actions";

const initialState: OnboardingFormState = {};

export function BranchForm({ orgId }: { orgId: string }) {
  const action = createBranchAction.bind(null, orgId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre de la sucursal *</Label>
        <Input id="name" name="name" required placeholder="Sucursal Centro" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Dirección</Label>
        <Input id="address" name="address" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitud (opcional)</Label>
          <Input id="latitude" name="latitude" type="number" step="any" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitud (opcional)</Label>
          <Input id="longitude" name="longitude" type="number" step="any" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" name="phone" type="tel" />
      </div>
      <p className="text-xs text-muted-foreground">
        Puedes agregar la ubicación exacta después; no es obligatoria para empezar.
      </p>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando..." : "Continuar"}
      </Button>
    </form>
  );
}
