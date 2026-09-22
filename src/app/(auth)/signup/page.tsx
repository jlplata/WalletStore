import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Crea tu cuenta</CardTitle>
        <CardDescription>Empieza gratis, sin tarjeta de crédito.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
        <p className="mt-4 text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
            Inicia sesión
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
