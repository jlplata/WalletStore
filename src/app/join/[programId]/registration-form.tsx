"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { registerCustomerAction, type JoinFormState } from "./actions";

const initialState: JoinFormState = {};

export function RegistrationForm({
  organizationId,
  programId,
}: {
  organizationId: string;
  programId: string;
}) {
  const action = registerCustomerAction.bind(null, organizationId, programId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombre *</Label>
          <Input id="firstName" name="firstName" required autoComplete="given-name" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apellido</Label>
          <Input id="lastName" name="lastName" autoComplete="family-name" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">WhatsApp / Teléfono</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="55 1234 5678" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Correo (opcional)</Label>
        <Input id="email" name="email" type="email" autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="birthdate">Fecha de nacimiento (opcional)</Label>
        <Input id="birthdate" name="birthdate" type="date" />
      </div>

      <div className="flex items-start gap-2">
        <Checkbox id="marketingConsent" name="marketingConsent" className="mt-0.5" />
        <Label htmlFor="marketingConsent" className="text-xs font-normal text-muted-foreground">
          Quiero recibir promociones y novedades por correo o WhatsApp.
        </Label>
      </div>
      <div className="flex items-start gap-2">
        <Checkbox id="termsAccepted" name="termsAccepted" required className="mt-0.5" />
        <Label htmlFor="termsAccepted" className="text-xs font-normal text-muted-foreground">
          Acepto los{" "}
          <a href="/legal/terminos" target="_blank" className="underline">
            términos
          </a>{" "}
          y el{" "}
          <a href="/legal/privacidad" target="_blank" className="underline">
            aviso de privacidad
          </a>
          . *
        </Label>
      </div>

      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={pending}>
        {pending ? "Registrando..." : "Obtener mi tarjeta"}
      </Button>
    </form>
  );
}
