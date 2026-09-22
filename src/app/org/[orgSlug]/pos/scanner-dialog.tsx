"use client";

import { useEffect, useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// Uses the native BarcodeDetector API (Chrome/Android/Edge) when available.
// Safari/iOS doesn't support it yet, so we fail gracefully to manual search
// instead of pulling in a JS QR-decoding library — per the product spec,
// "camera when possible", with manual search always available as a fallback.
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => {
      detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
    };
  }
}

export function ScannerDialog({ onDetected }: { onDetected: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [supported] = useState(
    () => typeof window !== "undefined" && !!window.BarcodeDetector
  );
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open || !window.BarcodeDetector) return;

    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) {
              onDetected(codes[0].rawValue);
              setOpen(false);
              return;
            }
          } catch {
            // Detection can transiently fail on a frame; keep trying.
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => setError("No se pudo acceder a la cámara. Usa la búsqueda manual."));

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onDetected]);

  return (
    <>
      <Button size="lg" className="h-24 w-full text-lg" onClick={() => setOpen(true)}>
        <ScanLine className="h-6 w-6" /> Escanear cliente
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escanea el QR del cliente</DialogTitle>
            <DialogDescription>Apunta la cámara al código QR de la tarjeta del cliente.</DialogDescription>
          </DialogHeader>
          {supported ? (
            <div className="overflow-hidden rounded-lg bg-black">
              {error ? (
                <p className="p-6 text-center text-sm text-destructive">{error}</p>
              ) : (
                <video ref={videoRef} muted playsInline className="aspect-square w-full object-cover" />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tu navegador no soporta escaneo de QR por cámara. Usa la búsqueda manual.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
