"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { setOrganizationStatusAction } from "../actions";
import type { OrganizationStatus } from "@/lib/supabase/database.types";

export function SuspendButton({ orgId, status }: { orgId: string; status: OrganizationStatus }) {
  const [pending, startTransition] = useTransition();
  const nextStatus: OrganizationStatus = status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";

  return (
    <Button
      variant={status === "SUSPENDED" ? "default" : "destructive"}
      disabled={pending}
      onClick={() => startTransition(() => setOrganizationStatusAction(orgId, nextStatus))}
    >
      {status === "SUSPENDED" ? "Reactivar organización" : "Suspender organización"}
    </Button>
  );
}
