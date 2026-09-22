import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export default async function AdminAuditPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("audit_logs")
    .select("id, organization_id, actor_user_id, action, entity_type, entity_id, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Auditoría</h1>
      <Card>
        <CardContent className="p-0">
          {logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Organización</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">{log.action}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.entity_type} {log.entity_id ? `#${log.entity_id.slice(0, 8)}` : ""}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.organization_id?.slice(0, 8) ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(log.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-10 text-center text-sm text-muted-foreground">
              Sin eventos de auditoría todavía.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
