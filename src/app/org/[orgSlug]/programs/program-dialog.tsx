"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createProgramFullAction, type ProgramFormState } from "./actions";

const initialState: ProgramFormState = {};

export function ProgramDialog({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"STAMPS" | "POINTS">("STAMPS");
  const action = createProgramFullAction.bind(null, orgId, orgSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Nuevo programa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo programa de lealtad</DialogTitle>
          <DialogDescription>Elige cómo tus clientes ganarán recompensas.</DialogDescription>
        </DialogHeader>
        <form
          action={async (formData) => {
            await formAction(formData);
            setOpen(false);
          }}
          className="space-y-5"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del programa *</Label>
            <Input id="name" name="name" required placeholder="Programa VIP" />
          </div>

          <Tabs value={type} onValueChange={(v) => setType(v as "STAMPS" | "POINTS")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="STAMPS">Sellos</TabsTrigger>
              <TabsTrigger value="POINTS">Puntos</TabsTrigger>
            </TabsList>
            <input type="hidden" name="type" value={type} />

            <TabsContent value="STAMPS" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stampsRequired">Sellos para recompensa *</Label>
                  <Input id="stampsRequired" name="stampsRequired" type="number" min={1} defaultValue={10} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stampsPerPurchase">Sellos por compra</Label>
                  <Input id="stampsPerPurchase" name="stampsPerPurchase" type="number" min={1} defaultValue={1} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="POINTS" className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currencyUnitCents">Por cada $ (centavos)</Label>
                  <Input id="currencyUnitCents" name="currencyUnitCents" type="number" min={1} defaultValue={1000} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pointsPerCurrencyUnit">Puntos otorgados</Label>
                  <Input
                    id="pointsPerCurrencyUnit"
                    name="pointsPerCurrencyUnit"
                    type="number"
                    step="0.1"
                    min={0.1}
                    defaultValue={1}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pointsCostForReward">Puntos para recompensa</Label>
                <Input id="pointsCostForReward" name="pointsCostForReward" type="number" min={1} defaultValue={100} />
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="rewardHeadline">Recompensa principal *</Label>
            <Input id="rewardHeadline" name="rewardHeadline" required placeholder="Café gratis" />
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creando..." : "Crear programa"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
