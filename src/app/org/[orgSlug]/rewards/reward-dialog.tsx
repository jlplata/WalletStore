"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { createRewardAction, type RewardFormState } from "./actions";

const initialState: RewardFormState = {};

const REWARD_TYPES = [
  { value: "FREE_ITEM", label: "Producto gratis" },
  { value: "DISCOUNT_FIXED", label: "Descuento fijo" },
  { value: "DISCOUNT_PERCENTAGE", label: "Descuento porcentual" },
  { value: "CUSTOM", label: "Personalizado" },
];

type Program = { id: string; name: string; type: "STAMPS" | "POINTS" };

export function RewardDialog({
  orgId,
  orgSlug,
  programs,
}: {
  orgId: string;
  orgSlug: string;
  programs: Program[];
}) {
  const [open, setOpen] = useState(false);
  const [programId, setProgramId] = useState(programs[0]?.id ?? "");
  const [type, setType] = useState("FREE_ITEM");
  const action = createRewardAction.bind(null, orgId, orgSlug);
  const [state, formAction, pending] = useActionState(action, initialState);
  const selectedProgram = programs.find((p) => p.id === programId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={programs.length === 0}>
          <Plus className="h-4 w-4" /> Nueva recompensa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva recompensa</DialogTitle>
          <DialogDescription>Define qué reciben tus clientes al alcanzar la meta.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await formAction(formData);
            setOpen(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="programId">Programa *</Label>
            <Select name="programId" value={programId} onValueChange={setProgramId} required>
              <SelectTrigger id="programId">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input id="name" name="name" required placeholder="Café gratis" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Select name="type" value={type} onValueChange={setType} required>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REWARD_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedProgram?.type === "STAMPS" ? (
            <div className="space-y-2">
              <Label htmlFor="costStamps">Costo en sellos *</Label>
              <Input id="costStamps" name="costStamps" type="number" min={1} defaultValue={10} required />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="costPoints">Costo en puntos *</Label>
              <Input id="costPoints" name="costPoints" type="number" min={1} defaultValue={100} required />
            </div>
          )}

          {(type === "DISCOUNT_FIXED" || type === "DISCOUNT_PERCENTAGE") && (
            <div className="space-y-2">
              <Label htmlFor="discountValue">
                {type === "DISCOUNT_FIXED" ? "Monto de descuento (centavos)" : "Porcentaje de descuento"}
              </Label>
              <Input
                id="discountValue"
                name={type === "DISCOUNT_FIXED" ? "discountAmountCents" : "discountPercentage"}
                type="number"
                min={0}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="perCustomerLimit">Límite por cliente (opcional)</Label>
            <Input id="perCustomerLimit" name="perCustomerLimit" type="number" min={1} />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creando..." : "Crear recompensa"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
