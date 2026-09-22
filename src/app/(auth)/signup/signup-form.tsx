"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction, type AuthFormState } from "../actions";

const initialState: AuthFormState = {};

export function SignupForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signUpAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-2">
        <Label htmlFor="fullName">Nombre completo</Label>
        <Input id="fullName" name="fullName" required defaultValue={state.values?.fullName} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creando cuenta..." : "Crear cuenta gratis"}
      </Button>
      <p className="text-xs text-muted-foreground">
        Al crear una cuenta aceptas nuestros{" "}
        <a href="/legal/terminos" className="underline underline-offset-2">
          Términos
        </a>{" "}
        y{" "}
        <a href="/legal/privacidad" className="underline underline-offset-2">
          Aviso de privacidad
        </a>
        .
      </p>
    </form>
  );
}
