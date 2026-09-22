"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, Wallet, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NAV_ITEMS } from "./nav-items";
import type { MemberRole } from "@/lib/supabase/database.types";

const ROLE_LABELS: Record<MemberRole, string> = {
  ORGANIZATION_OWNER: "Dueño",
  ORGANIZATION_ADMIN: "Administrador",
  BRANCH_MANAGER: "Gerente de sucursal",
  CASHIER: "Cajero",
};

function NavLinks({
  items,
  orgSlug,
  pathname,
  onNavigate,
}: {
  items: typeof NAV_ITEMS;
  orgSlug: string;
  pathname: string | null;
  onNavigate: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {items.map((item) => {
        const href = item.href(orgSlug);
        const active = pathname === href || pathname?.startsWith(href + "/");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  orgName,
  orgSlug,
  role,
  userEmail,
  children,
}: {
  orgName: string;
  orgSlug: string;
  role: MemberRole;
  userEmail: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-4 font-semibold">
          <Wallet className="h-5 w-5 text-brand" />
          <span className="truncate">{orgName}</span>
        </div>
        <NavLinks items={items} orgSlug={orgSlug} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
        <div className="border-t p-3">
          <div className="mb-2 px-1">
            <p className="truncate text-sm font-medium">{userEmail}</p>
            <Badge variant="secondary" className="mt-1">
              {ROLE_LABELS[role]}
            </Badge>
          </div>
          <form action="/auth/sign-out" method="post">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2" type="submit">
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:hidden">
          <div className="flex items-center gap-2 font-semibold">
            <Wallet className="h-5 w-5 text-brand" />
            {orgName}
          </div>
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="w-72 max-w-[85vw] flex-col border-r bg-background flex">
              <div className="flex h-16 items-center justify-between border-b px-4 font-semibold">
                {orgName}
                <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <NavLinks items={items} orgSlug={orgSlug} pathname={pathname} onNavigate={() => setMobileOpen(false)} />
              <div className="border-t p-3">
                <form action="/auth/sign-out" method="post">
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2" type="submit">
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </Button>
                </form>
              </div>
            </div>
            <div className="flex-1 bg-black/40" onClick={() => setMobileOpen(false)} />
          </div>
        )}

        <main className="flex-1 bg-muted/20 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
