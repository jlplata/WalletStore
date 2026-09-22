"use client";

import { useActionState, useState } from "react";
import { Plus, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createWebhookAction, WEBHOOK_EVENT_TYPES, type WebhookFormState } from "./webhooks-actions";

const initialState: WebhookFormState = {};

export function WebhookDialog({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const action = createWebhookAction.bind(null, orgId, orgSlug);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setCopied(false);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Nuevo webhook
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo webhook</DialogTitle>
          <DialogDescription>
            Recibirás un POST firmado (HMAC-SHA256) cada vez que ocurra alguno de estos eventos.
          </DialogDescription>
        </DialogHeader>

        {state.secret ? (
          <div className="space-y-3">
            <p className="text-sm">
              Guarda este secreto ahora — no volverá a mostrarse. Úsalo para verificar la firma
              <code className="mx-1 rounded bg-muted px-1">X-WalletStore-Signature</code>.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={state.secret} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={async () => {
                  await navigator.clipboard.writeText(state.secret!);
                  setCopied(true);
                }}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button className="w-full" onClick={() => setOpen(false)}>
              Listo
            </Button>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input id="url" name="url" type="url" required placeholder="https://tu-n8n.com/webhook/..." />
            </div>
            <div className="space-y-2">
              <Label>Eventos *</Label>
              {WEBHOOK_EVENT_TYPES.map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox id={type} name="eventTypes" value={type} />
                  <Label htmlFor={type} className="font-normal">
                    {type}
                  </Label>
                </div>
              ))}
            </div>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Creando..." : "Crear webhook"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
