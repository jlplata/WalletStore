"use client";

import { useActionState } from "react";
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
import { createOrganizationAction, type OnboardingFormState } from "./actions";
import { BUSINESS_CATEGORIES } from "@/lib/validations/onboarding";

const initialState: OnboardingFormState = {};

export function BusinessInfoForm() {
  const [state, formAction, pending] = useActionState(createOrganizationAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre comercial *</Label>
        <Input id="name" name="name" required placeholder="Café Demo" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="legalName">Razón social (opcional)</Label>
        <Input id="legalName" name="legalName" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Categoría *</Label>
        <Select name="category" required defaultValue={BUSINESS_CATEGORIES[0]}>
          <SelectTrigger id="category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <input type="hidden" name="country" value="MX" />
      <input type="hidden" name="currency" value="MXN" />
      <input type="hidden" name="timezone" value="America/Mexico_City" />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input id="phone" name="phone" type="tel" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="website">Sitio web (opcional)</Label>
        <Input id="website" name="website" type="url" placeholder="https://" />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creando..." : "Continuar"}
      </Button>
    </form>
  );
}
