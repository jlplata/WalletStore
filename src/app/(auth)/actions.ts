"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error?: string;
  values?: Record<string, string>;
};

const signUpSchema = z.object({
  fullName: z.string().min(2, "Ingresa tu nombre completo."),
  email: z.string().email("Correo inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

export async function signUpAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Datos inválidos.",
      values: { fullName: String(formData.get("fullName") ?? ""), email: String(formData.get("email") ?? "") },
    };
  }

  const { fullName, email, password } = parsed.data;
  const supabase = await createClient();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${appUrl}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    return { error: error.message, values: { fullName, email } };
  }

  redirect("/signup/revisa-tu-correo");
}

const signInSchema = z.object({
  email: z.string().email("Correo inválido."),
  password: z.string().min(1, "Ingresa tu contraseña."),
});

export async function signInAction(
  _prevState: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      error: "Correo o contraseña incorrectos.",
      values: { email: parsed.data.email },
    };
  }

  redirect("/dashboard");
}
