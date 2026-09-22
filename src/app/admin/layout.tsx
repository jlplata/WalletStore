import Link from "next/link";
import { Shield, Building2, ScrollText, LogOut } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/authz/platform";
import { Button } from "@/components/ui/button";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requirePlatformAdmin();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-4 font-semibold">
          <Shield className="h-5 w-5 text-brand" />
          Platform Admin
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Shield className="h-4 w-4" /> Dashboard
          </Link>
          <Link
            href="/admin/organizations"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <Building2 className="h-4 w-4" /> Organizaciones
          </Link>
          <Link
            href="/admin/audit"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <ScrollText className="h-4 w-4" /> Auditoría
          </Link>
        </nav>
        <div className="border-t p-3">
          <form action="/auth/sign-out" method="post">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2" type="submit">
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 bg-muted/20 p-4 sm:p-6">{children}</main>
    </div>
  );
}
