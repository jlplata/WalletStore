"use client";

import { useState, useTransition } from "react";
import { QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toggleProgramActiveAction } from "./actions";

export function ToggleProgramActiveButton({
  orgId,
  orgSlug,
  programId,
  isActive,
}: {
  orgId: string;
  orgSlug: string;
  programId: string;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => toggleProgramActiveAction(orgId, orgSlug, programId, !isActive))}
    >
      {isActive ? "Desactivar" : "Activar"}
    </Button>
  );
}

export function ProgramQrDialog({ joinUrl, programName }: { joinUrl: string; programName: string }) {
  const [open, setOpen] = useState(false);
  const qrSrc = `/api/qr?url=${encodeURIComponent(joinUrl)}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <QrCode className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>QR de {programName}</DialogTitle>
          <DialogDescription>Comparte este código para que tus clientes se registren.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrSrc} alt={`QR de ${programName}`} className="h-56 w-56 rounded-lg border" />
          <a href={qrSrc} download={`qr-${programName}.png`} className="w-full">
            <Button variant="outline" className="w-full" type="button">
              Descargar QR
            </Button>
          </a>
          <p className="break-all text-center text-xs text-muted-foreground">{joinUrl}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
