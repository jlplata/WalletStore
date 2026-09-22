import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export default async function AdminOrganizationsPage() {
  const supabase = await createClient();
  const { data: orgs } = await supabase
    .from("organizations")
    .select("id, name, slug, status, category, country, created_at, is_demo")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Organizaciones</h1>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(orgs ?? []).map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/organizations/${org.id}`} className="hover:underline">
                      {org.name}
                    </Link>
                    {org.is_demo && (
                      <Badge variant="secondary" className="ml-2">
                        DEMO
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{org.category ?? "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        org.status === "ACTIVE" ? "success" : org.status === "SUSPENDED" ? "destructive" : "secondary"
                      }
                    >
                      {org.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(org.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
