import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = [
  { key: "negocio", label: "Negocio" },
  { key: "marca", label: "Marca" },
  { key: "sucursal", label: "Sucursal" },
  { key: "programa", label: "Programa" },
  { key: "wallet", label: "Wallet" },
  { key: "qr", label: "QR" },
] as const;

export type OnboardingStepKey = (typeof STEPS)[number]["key"];

export function OnboardingStepper({ current }: { current: OnboardingStepKey }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="mx-auto mb-8 flex w-full max-w-2xl items-center justify-between">
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={step.key} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary text-primary",
                  !done && !active && "border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-xs sm:block",
                  active ? "font-medium text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("mx-2 h-px flex-1", done ? "bg-primary" : "bg-border")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
