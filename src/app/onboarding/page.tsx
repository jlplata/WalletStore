import { requireUser } from "@/lib/authz/session";

// Full guided wizard (sections 1-6 of the product spec) lands in Fase 2.
export default async function OnboardingPage() {
  await requireUser();
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-semibold">Configura tu negocio</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        El asistente de creación de negocio se construye en la Fase 2.
      </p>
    </div>
  );
}
