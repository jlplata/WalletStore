"use client";

import { useActionState } from "react";
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
import { createAndSendCampaignAction, type CampaignFormState } from "../actions";

const initialState: CampaignFormState = {};

const TYPES = [
  { value: "PROMOTION", label: "Promoción" },
  { value: "BIRTHDAY", label: "Cumpleaños" },
  { value: "WIN_BACK", label: "Reactivación" },
  { value: "BONUS_POINTS", label: "Puntos extra" },
  { value: "DOUBLE_STAMPS", label: "Sellos dobles" },
  { value: "CUSTOM", label: "Personalizada" },
];

const SEGMENTS = [
  { value: "ALL", label: "Todos los clientes" },
  { value: "NEW", label: "Nuevos" },
  { value: "ACTIVE", label: "Activos" },
  { value: "REPEAT", label: "Recurrentes" },
  { value: "VIP", label: "VIP" },
  { value: "AT_RISK", label: "En riesgo" },
  { value: "INACTIVE_30", label: "Inactivos 30 días" },
  { value: "INACTIVE_60", label: "Inactivos 60 días" },
  { value: "BIRTHDAY_MONTH", label: "Cumpleaños este mes" },
  { value: "NEAR_REWARD", label: "Cerca de recompensa" },
];

export function CampaignForm({
  orgId,
  orgSlug,
  programs,
}: {
  orgId: string;
  orgSlug: string;
  programs: { id: string; name: string }[];
}) {
  const action = createAndSendCampaignAction.bind(null, orgId, orgSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre interno *</Label>
        <Input id="name" name="name" required placeholder="Reactivación de agosto" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo *</Label>
          <Select name="type" required defaultValue="PROMOTION">
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="programId">Programa *</Label>
          <Select name="programId" required defaultValue={programs[0]?.id}>
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
      </div>
      <div className="space-y-2">
        <Label htmlFor="audienceSegment">Audiencia *</Label>
        <Select name="audienceSegment" required defaultValue="ALL">
          <SelectTrigger id="audienceSegment">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEGMENTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject">Asunto *</Label>
        <Input id="subject" name="subject" required placeholder="¡Te extrañamos! Ven por tu recompensa" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Mensaje *</Label>
        <Textarea id="message" name="message" required rows={5} />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending || programs.length === 0}>
        {pending ? "Enviando..." : "Enviar ahora"}
      </Button>
      {programs.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">Crea un programa primero.</p>
      )}
    </form>
  );
}
