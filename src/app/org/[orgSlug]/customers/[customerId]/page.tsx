import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { resolveOrgForAction } from "@/lib/org/resolve";
import { formatDateTime } from "@/lib/utils";

const LEDGER_LABELS: Record<string, string> = {
  PURCHASE: "Compra",
  STAMP_EARN: "Sello ganado",
  POINTS_EARN: "Puntos ganados",
  BONUS: "Bono",
  ADJUSTMENT: "Ajuste manual",
  REDEMPTION: "Canje",
  EXPIRATION: "Expiración",
  REFUND: "Reembolso",
};

export default async function CustomerDetailPage({
  params,
}: PageProps<"/org/[orgSlug]/customers/[customerId]">) {
  const { orgSlug, customerId } = await params;
  const { org } = await resolveOrgForAction(orgSlug, "customer.view");

  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .eq("organization_id", org.id)
    .single();

  if (!customer) notFound();

  const [{ data: enrollments }, { data: ledger }, { data: rewards }, { data: consents }, { data: passes }] =
    await Promise.all([
      supabase
        .from("customer_program_enrollments")
        .select("stamps_balance, points_balance, visits_count, total_spend_cents, last_visit_at, programs(name, type)")
        .eq("customer_id", customerId),
      supabase
        .from("loyalty_ledger")
        .select("id, type, stamps_delta, points_delta, description, created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("customer_rewards")
        .select("id, status, redemption_code, unlocked_at, redeemed_at, rewards(name)")
        .eq("customer_id", customerId)
        .order("unlocked_at", { ascending: false }),
      supabase
        .from("customer_consents")
        .select("consent_type, granted, source, created_at")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("wallet_passes")
        .select("platform, provider_mode, status, last_pushed_at")
        .eq("customer_id", customerId),
    ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {customer.first_name} {customer.last_name ?? ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          {customer.phone ?? "sin teléfono"} · {customer.email ?? "sin correo"} · Código {customer.public_code}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(enrollments ?? []).map((e, i) => {
          const program = e.programs as unknown as { name: string; type: string } | null;
          return (
            <Card key={i}>
              <CardHeader>
                <CardTitle className="text-base">{program?.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-2xl font-bold">
                  {program?.type === "STAMPS" ? `${e.stamps_balance} sellos` : `${e.points_balance} pts`}
                </p>
                <p className="text-muted-foreground">{e.visits_count} visitas</p>
                <p className="text-muted-foreground">
                  Última visita: {e.last_visit_at ? formatDateTime(e.last_visit_at) : "—"}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          {passes && passes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {passes.map((p, i) => (
                <Badge key={i} variant={p.provider_mode === "LIVE" ? "success" : "warning"}>
                  {p.platform} · {p.provider_mode === "LIVE" ? "Real" : "Modo de prueba"} · {p.status}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aún no ha agregado su tarjeta a ningún Wallet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recompensas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recompensa</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(rewards ?? []).map((r) => {
                const reward = r.rewards as unknown as { name: string } | null;
                return (
                  <TableRow key={r.id}>
                    <TableCell>{reward?.name}</TableCell>
                    <TableCell>
                      <Badge variant={r.status === "AVAILABLE" ? "success" : "secondary"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.redemption_code}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(r.redeemed_at ?? r.unlocked_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!rewards || rewards.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Sin recompensas todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial (ledger)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Movimiento</TableHead>
                <TableHead>Sellos</TableHead>
                <TableHead>Puntos</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(ledger ?? []).map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{LEDGER_LABELS[l.type] ?? l.type}</TableCell>
                  <TableCell className={l.stamps_delta < 0 ? "text-destructive" : ""}>
                    {l.stamps_delta > 0 ? `+${l.stamps_delta}` : l.stamps_delta || "—"}
                  </TableCell>
                  <TableCell className={l.points_delta < 0 ? "text-destructive" : ""}>
                    {l.points_delta > 0 ? `+${l.points_delta}` : l.points_delta || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(l.created_at)}</TableCell>
                </TableRow>
              ))}
              {(!ledger || ledger.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                    Sin movimientos todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consentimientos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          {(consents ?? []).map((c, i) => (
            <p key={i}>
              {c.consent_type === "TERMS" ? "Términos" : "Marketing"}:{" "}
              {c.granted ? "aceptado" : "rechazado"} — {formatDateTime(c.created_at)} ({c.source})
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
