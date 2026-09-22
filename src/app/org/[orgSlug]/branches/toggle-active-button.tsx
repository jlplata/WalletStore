"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleBranchActiveAction } from "./actions";

export function ToggleActiveButton({
  orgId,
  orgSlug,
  branchId,
  isActive,
}: {
  orgId: string;
  orgSlug: string;
  branchId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(() => toggleBranchActiveAction(orgId, orgSlug, branchId, !isActive))
      }
    >
      {isActive ? "Suspender" : "Reactivar"}
    </Button>
  );
}
