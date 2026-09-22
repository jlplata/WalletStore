"use client";

import { useActionState, useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createBranchAction, updateBranchAction, type BranchFormState } from "./actions";

const initialState: BranchFormState = {};

type Branch = {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
};

export function BranchDialog({
  orgId,
  orgSlug,
  branch,
}: {
  orgId: string;
  orgSlug: string;
  branch?: Branch;
}) {
  const [open, setOpen] = useState(false);
  const action = branch
    ? updateBranchAction.bind(null, orgId, orgSlug, branch.id)
    : createBranchAction.bind(null, orgId, orgSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {branch ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" /> Nueva sucursal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{branch ? "Editar sucursal" : "Nueva sucursal"}</DialogTitle>
          <DialogDescription>
            Esta información se usa en reportes y, opcionalmente, en la ubicación de la tarjeta Wallet.
          </DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await formAction(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" required defaultValue={branch?.name} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input id="address" name="address" defaultValue={branch?.address ?? ""} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitud</Label>
              <Input
                id="latitude"
                name="latitude"
                type="number"
                step="any"
                defaultValue={branch?.latitude ?? undefined}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitud</Label>
              <Input
                id="longitude"
                name="longitude"
                type="number"
                step="any"
                defaultValue={branch?.longitude ?? undefined}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={branch?.phone ?? ""} />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Guardando..." : "Guardar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
