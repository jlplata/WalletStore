"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { startCheckoutAction, openPortalAction } from "./actions";

// Server Actions called directly from an event handler (not a <form
// action>) still throw Next's internal redirect() signal on success; it
// must be re-thrown, not swallowed as a real error, or the redirect never
// happens.
function isNextRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function CheckoutButton({
  orgId,
  orgSlug,
  planCode,
}: {
  orgId: string;
  orgSlug: string;
  planCode: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await startCheckoutAction(orgId, orgSlug, planCode);
          } catch (err) {
            if (isNextRedirectError(err)) throw err;
            toast.error(err instanceof Error ? err.message : "No se pudo iniciar el pago.");
          }
        })
      }
    >
      {pending ? "Redirigiendo..." : "Elegir plan"}
    </Button>
  );
}

export function PortalButton({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          try {
            await openPortalAction(orgId, orgSlug);
          } catch (err) {
            if (isNextRedirectError(err)) throw err;
            toast.error(err instanceof Error ? err.message : "No se pudo abrir el portal.");
          }
        })
      }
    >
      {pending ? "Abriendo..." : "Administrar facturación"}
    </Button>
  );
}
