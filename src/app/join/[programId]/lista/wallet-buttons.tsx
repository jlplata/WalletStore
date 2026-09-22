"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";

export function WalletButtons({ customerId, programId }: { customerId: string; programId: string }) {
  const [primary, setPrimary] = useState<"APPLE" | "GOOGLE" | null>(null);

  useEffect(() => {
    // Reads navigator.userAgent, which only exists client-side — this must
    // run post-mount (both platforms' buttons render identically during SSR
    // and the first client paint, then re-order once we know the device).
    const ua = navigator.userAgent;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: derives UI order from a browser-only API unavailable during render/SSR.
    setPrimary(/iPhone|iPad|iPod/.test(ua) ? "APPLE" : /Android/.test(ua) ? "GOOGLE" : null);
  }, []);

  const appleHref = `/api/wallet/issue/${customerId}/${programId}/APPLE`;
  const googleHref = `/api/wallet/issue/${customerId}/${programId}/GOOGLE`;

  const AppleButton = (
    <a href={appleHref} className="block">
      <Button size="lg" variant={primary === "GOOGLE" ? "outline" : "default"} className="w-full">
        <Smartphone className="h-4 w-4" /> Add to Apple Wallet
      </Button>
    </a>
  );

  const GoogleButton = (
    <a href={googleHref} className="block">
      <Button size="lg" variant={primary === "APPLE" ? "outline" : "default"} className="w-full">
        <Smartphone className="h-4 w-4" /> Add to Google Wallet
      </Button>
    </a>
  );

  return (
    <div className="space-y-2">
      {primary === "GOOGLE" ? (
        <>
          {GoogleButton}
          {AppleButton}
        </>
      ) : (
        <>
          {AppleButton}
          {GoogleButton}
        </>
      )}
    </div>
  );
}
