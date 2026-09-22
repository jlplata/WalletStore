import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { getOrgMembership } from "@/lib/authz/session";
import { resolveOrgForAction } from "@/lib/org/resolve";
import { maskEmail, maskPhone } from "@/lib/format";
import { formatDate } from "@/lib/utils";

const SEGMENTS = [
  { value: "ALL", label: "Todos" },
  { value: "NEW", label: "Nuevos" },
  { value: "ACTIVE", label: "Activos" },
  { value: "REPEAT", label: "Recurrentes" },
  { value: "VIP", label: "VIP" },
  { value: "AT_RISK", label: "En riesgo" },
  { value: "INACTIVE_30", label: "Inactivos 30 días" },
  { value: "INACTIVE_60", label: "Inactivos 60 días" },
  { value: "BIRTHDAY_MONTH", label: "Cumpleaños este mes" },
  { value: "NEAR_REWARD", label: "Cerca de recompensa" },
];

export default async function CustomersPage({
  params,
  searchParams,
}: PageProps<"/org/[orgSlug]/customers">) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const { org } = await resolveOrgForAction(orgSlug, "customer.view");
  const membership = await getOrgMembership(org.id);
  const canSeeFullContact = membership?.isPlatformAdmin || membership?.role === "ORGANIZATION_OWNER" || membership?.role === "ORGANIZATION_ADMIN";

  const supabase = await createClient();
  const { data: programs } = await supabase
    .from("programs")
    .select("id, name, type")
    .eq("organization_id", org.id)
    .order("created_at");

  const programId = typeof sp.programId === "string" ? sp.programId : programs?.[0]?.id;
  const segment = typeof sp.segment === "string" ? sp.segment : "ALL";
  const q = typeof sp.q === "string" ? sp.q : "";

  let customerIds: string[] | null = null;
  if (programId && segment !== "ALL") {
    const { data } = await supabase.rpc("customers_in_segment", {
      p_organization_id: org.id,
      p_program_id: programId,
      p_segment: segment,
    });
    customerIds = (data ?? []).map((c) => c.id);
  }

  let rows: {
    id: string;
    first_name: string;
    last_name: string | null;
    phone: string | null;
    email: string | null;
    created_at: string;
    stamps_balance: number;
    points_balance: number;
    visits_count: number;
    last_visit_at: string | null;
  }[] = [];

  if (programId) {
    let query = supabase
      .from("customer_program_enrollments")
      .select(
        "stamps_balance, points_balance, visits_count, last_visit_at, customers!inner(id, first_name, last_name, phone, email, created_at)"
      )
      .eq("organization_id", org.id)
      .eq("program_id", programId)
      .order("last_visit_at", { ascending: false, nullsFirst: false })
      .limit(100);

    if (customerIds) {
      query = query.in("customer_id", customerIds);
    }
    if (q) {
      query = query.or(
        `first_name.ilike.%${q}%,last_name.ilike.%${q}%,phone.ilike.%${q}%`,
        { referencedTable: "customers" }
      );
    }

    const { data } = await query;
    rows = (data ?? []).map((e) => {
      const c = e.customers as unknown as {
        id: string;
        first_name: string;
        last_name: string | null;
        phone: string | null;
        email: string | null;
        created_at: string;
      };
      return {
        id: c.id,
        first_name: c.first_name,
        last_name: c.last_name,
        phone: c.phone,
        email: c.email,
        created_at: c.created_at,
        stamps_balance: e.stamps_balance,
        points_balance: e.points_balance,
        visits_count: e.visits_count,
        last_visit_at: e.last_visit_at,
      };
    });
  }

  const selectedProgram = programs?.find((p) => p.id === programId);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} cliente{rows.length === 1 ? "" : "s"} en {selectedProgram?.name ?? "—"}.
        </p>
      </div>

      <form method="get" className="flex flex-wrap gap-2">
        <Select name="programId" defaultValue={programId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Programa" />
          </SelectTrigger>
          <SelectContent>
            {(programs ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select name="segment" defaultValue={segment}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Segmento" />
          </SelectTrigger>
          <SelectContent>
            {SEGMENTS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input name="q" placeholder="Buscar por nombre o teléfono" defaultValue={q} className="w-64" />
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <Card>
        <CardContent className="p-0">
          {rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Visitas</TableHead>
                  <TableHead>Última visita</TableHead>
                  <TableHead>Cliente desde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/org/${org.slug}/customers/${c.id}`} className="hover:underline">
                        {c.first_name} {c.last_name ?? ""}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      <div>{canSeeFullContact ? c.phone ?? "—" : maskPhone(c.phone)}</div>
                      <div>{canSeeFullContact ? c.email ?? "—" : maskEmail(c.email)}</div>
                    </TableCell>
                    <TableCell>
                      {selectedProgram?.type === "STAMPS" ? (
                        <Badge variant="secondary">{c.stamps_balance} sellos</Badge>
                      ) : (
                        <Badge variant="secondary">{c.points_balance} pts</Badge>
                      )}
                    </TableCell>
                    <TableCell>{c.visits_count}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.last_visit_at ? formatDate(c.last_visit_at) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(c.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">
              {programId
                ? "No hay clientes con estos filtros todavía."
                : "Crea un programa de lealtad para empezar a registrar clientes."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
