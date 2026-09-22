"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitPrivacyRequestAction, type PrivacyRequestState } from "./actions";

const initialState: PrivacyRequestState = {};

export function DeleteDataForm() {
  const [state, formAction, pending] = useActionState(submitPrivacyRequestAction, initialState);

  if (state.success) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <CheckCircle2 className="h-5 w-5 shrink-0" />
        Recibimos tu solicitud. El negocio la procesará y te contactará si es necesario.
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <Input id="phone" name="phone" type="tel" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="notes">¿Con qué negocio te registraste? (opcional)</Label>
        <Textarea id="notes" name="notes" rows={3} />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Enviar solicitud"}
      </Button>
    </form>
  );
}
