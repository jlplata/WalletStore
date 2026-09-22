import type { MemberRole } from "@/lib/supabase/database.types";
import {
  LayoutDashboard,
  Users,
  ScanLine,
  Layers,
  Gift,
  Building2,
  UsersRound,
  Megaphone,
  CreditCard,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: (slug: string) => string;
  icon: typeof LayoutDashboard;
  roles: MemberRole[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: (slug) => `/org/${slug}/dashboard`,
    icon: LayoutDashboard,
    roles: ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN", "BRANCH_MANAGER", "CASHIER"],
  },
  {
    label: "Modo caja",
    href: (slug) => `/org/${slug}/pos`,
    icon: ScanLine,
    roles: ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN", "BRANCH_MANAGER", "CASHIER"],
  },
  {
    label: "Clientes",
    href: (slug) => `/org/${slug}/customers`,
    icon: Users,
    roles: ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN", "BRANCH_MANAGER", "CASHIER"],
  },
  {
    label: "Programas",
    href: (slug) => `/org/${slug}/programs`,
    icon: Layers,
    roles: ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"],
  },
  {
    label: "Recompensas",
    href: (slug) => `/org/${slug}/rewards`,
    icon: Gift,
    roles: ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"],
  },
  {
    label: "Campañas",
    href: (slug) => `/org/${slug}/campaigns`,
    icon: Megaphone,
    roles: ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"],
  },
  {
    label: "Sucursales",
    href: (slug) => `/org/${slug}/branches`,
    icon: Building2,
    roles: ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"],
  },
  {
    label: "Equipo",
    href: (slug) => `/org/${slug}/team`,
    icon: UsersRound,
    roles: ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"],
  },
  {
    label: "Facturación",
    href: (slug) => `/org/${slug}/billing`,
    icon: CreditCard,
    roles: ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"],
  },
  {
    label: "Configuración",
    href: (slug) => `/org/${slug}/settings`,
    icon: Settings,
    roles: ["ORGANIZATION_OWNER", "ORGANIZATION_ADMIN"],
  },
];
