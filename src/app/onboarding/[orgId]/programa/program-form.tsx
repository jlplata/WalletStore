"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createProgramAction, type OnboardingFormState } from "../../actions";

const initialState: OnboardingFormState = {};

export function ProgramForm({ orgId }: { orgId: string }) {
  const action = createProgramAction.bind(null, orgId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [type, setType] = useState<"STAMPS" | "POINTS">("STAMPS");

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del programa *</Label>
        <Input id="name" name="name" required placeholder="Café Club" />
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
              <Label htmlFor="stampsRequired">Sellos para la recompensa *</Label>
              <Input
                id="stampsRequired"
                name="stampsRequired"
                type="number"
                min={1}
                max={100}
                defaultValue={10}
                required={type === "STAMPS"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stampsPerPurchase">Sellos por compra</Label>
              <Input id="stampsPerPurchase" name="stampsPerPurchase" type="number" min={1} defaultValue={1} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="minPurchaseAmountCentsStamps">Compra mínima (MXN, opcional)</Label>
            <Input
              id="minPurchaseAmountCentsStamps"
              name="minPurchaseAmountCents"
              type="number"
              min={0}
              defaultValue={0}
              placeholder="0"
            />
          </div>
        </TabsContent>

        <TabsContent value="POINTS" className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="currencyUnitCents">Por cada (MXN) *</Label>
              <Input
                id="currencyUnitCents"
                name="currencyUnitCentsDisplay"
                type="number"
                min={1}
                defaultValue={10}
                onChange={(e) => {
                  const hidden = document.getElementById("currencyUnitCentsHidden") as HTMLInputElement | null;
                  if (hidden) hidden.value = String(Math.round(Number(e.target.value) * 100));
                }}
              />
              <input type="hidden" id="currencyUnitCentsHidden" name="currencyUnitCents" defaultValue={1000} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pointsPerCurrencyUnit">Puntos otorgados *</Label>
              <Input
                id="pointsPerCurrencyUnit"
                name="pointsPerCurrencyUnit"
                type="number"
                step="0.1"
                min={0.1}
                defaultValue={1}
                required={type === "POINTS"}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pointsCostForReward">Puntos para la recompensa *</Label>
            <Input
              id="pointsCostForReward"
              name="pointsCostForReward"
              type="number"
              min={1}
              defaultValue={100}
              required={type === "POINTS"}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <Label htmlFor="rewardHeadline">Recompensa principal *</Label>
        <Input id="rewardHeadline" name="rewardHeadline" required placeholder="Café gratis" />
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando..." : "Continuar"}
      </Button>
    </form>
  );
}
