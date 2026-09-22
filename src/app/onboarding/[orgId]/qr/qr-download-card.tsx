"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QrDownloadCard({
  qrDataUrl,
  joinUrl,
  programName,
}: {
  qrDataUrl: string;
  joinUrl: string;
  programName: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`QR de registro para ${programName}`} className="h-56 w-56 rounded-lg border" />
      </div>
      <div className="flex gap-2">
        <Input readOnly value={joinUrl} className="text-xs" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={async () => {
            await navigator.clipboard.writeText(joinUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <a href={qrDataUrl} download={`qr-${programName}.png`}>
        <Button type="button" variant="outline" className="w-full">
          <Download className="h-4 w-4" /> Descargar QR
        </Button>
      </a>
    </div>
  );
}
