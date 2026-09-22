"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleRewardActiveAction } from "./actions";

export function ToggleRewardButton({
  orgId,
  orgSlug,
  rewardId,
  isActive,
}: {
  orgId: string;
  orgSlug: string;
  rewardId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleRewardActiveAction(orgId, orgSlug, rewardId, !isActive))}
    >
      {isActive ? "Desactivar" : "Activar"}
    </Button>
  );
}
