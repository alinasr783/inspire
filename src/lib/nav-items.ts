import {
  LayoutDashboard,
  Building2,
  Users,
  Handshake,
  ListChecks,
  BarChart3,
  FileSpreadsheet,
  MonitorSmartphone,
  UserCircle,
  CalendarCheck,
  FileText,
  UserCheck,
  CalendarDays,
  Briefcase,
} from "lucide-react";

export const navItems = [
  { key: "dashboard", href: "/", icon: LayoutDashboard },
  { key: "properties", href: "/properties", icon: Building2 },
  { key: "unconfirmedData", href: "/unconfirmed-data", icon: FileSpreadsheet },
  { key: "clients", href: "/clients", icon: Users },
  { key: "companyClients", href: "/company-clients", icon: Briefcase },
  { key: "visits", href: "/visits", icon: CalendarCheck },
  { key: "attendance", href: "/attendance", icon: UserCheck },
  { key: "calendar", href: "/calendar", icon: CalendarDays },
  { key: "deals", href: "/deals", icon: Handshake },
  { key: "tasks", href: "/tasks", icon: ListChecks },
  { key: "reports", href: "/reports", icon: BarChart3 },
  { key: "contracts", href: "/contracts", icon: FileText },
  { key: "devices", href: "/devices", icon: MonitorSmartphone },
  { key: "profile", href: "/profile", icon: UserCircle },
] as const;

export type NavItem = (typeof navItems)[number];
