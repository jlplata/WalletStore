"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { deleteWebhookAction, toggleWebhookActiveAction } from "./webhooks-actions";

export function WebhookRowActions({
  orgId,
  orgSlug,
  webhookId,
  isActive,
}: {
  orgId: string;
  orgSlug: string;
  webhookId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isActive}
        disabled={pending}
        onCheckedChange={(checked) =>
          startTransition(() => toggleWebhookActiveAction(orgId, orgSlug, webhookId, checked))
        }
      />
      <Button
        variant="ghost"
        size="icon"
        disabled={pending}
        onClick={() => startTransition(() => deleteWebhookAction(orgId, orgSlug, webhookId))}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
