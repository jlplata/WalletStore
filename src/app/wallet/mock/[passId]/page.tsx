import { notFound } from "next/navigation";
import { AlertTriangle, Stamp } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWalletPassContent } from "@/lib/wallet/content";
import { Badge } from "@/components/ui/badge";

export default async function MockWalletPreviewPage({
  params,
}: PageProps<"/wallet/mock/[passId]">) {
  const { passId } = await params;
  const admin = createAdminClient();

  const { data: pass } = await admin
    .from("wallet_passes")
    .select("customer_id, program_id, platform")
    .eq("id", passId)
    .maybeSingle();

  if (!pass) notFound();

  const content = await getWalletPassContent(pass.customer_id, pass.program_id);
  if (!content) notFound();

  const isStamps = content.program.type === "STAMPS";

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-6 px-4 py-12">
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> Modo de prueba — no es una tarjeta real de{" "}
        {pass.platform === "APPLE" ? "Apple Wallet" : "Google Wallet"}
      </Badge>

      <div
        className="w-full overflow-hidden rounded-2xl shadow-lg"
        style={{ backgroundColor: content.organization.primaryColor, color: content.organization.secondaryColor }}
      >
        <div className="flex items-center gap-2 p-4">
          {content.organization.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={content.organization.logoUrl} alt="" className="h-8 w-8 rounded object-cover" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded bg-white/20">
              <Stamp className="h-4 w-4" />
            </div>
          )}
          <span className="text-sm font-semibold">{content.organization.name}</span>
        </div>
        <div className="space-y-1 px-4 pb-2">
          <p className="text-xs uppercase tracking-wide opacity-80">{content.program.name}</p>
          <p className="text-2xl font-bold">
            {isStamps
              ? `${content.balance.stamps} / ${content.program.stampsRequired ?? "–"} sellos`
              : `${content.balance.points} puntos`}
          </p>
        </div>
        <div className="border-t border-white/20 px-4 py-3 text-xs opacity-90">
          Próxima recompensa: {content.program.rewardHeadline ?? "—"}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        El negocio aún no ha configurado sus credenciales reales de{" "}
        {pass.platform === "APPLE" ? "Apple Wallet" : "Google Wallet"}. Cuando lo haga, esta misma
        tarjeta se emitirá de verdad, sin que tengas que hacer nada distinto.
      </p>
    </div>
  );
}
