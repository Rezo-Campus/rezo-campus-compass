import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { LogOut, Users, BookOpen, Calculator, FolderOpen, BarChart3, ShieldCheck } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { BrandMark } from "@/components/BrandMark";

export interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  etudiant: "Étudiant",
  conseiller: "Conseiller",
  admin: "Administrateur",
  comptable: "Comptable",
  chef_projet: "Chef de projet",
  commercial: "Commercial",
};

const SECTION_LINKS: { role: AppRole; label: string; to: string; icon: ComponentType<{ className?: string }> }[] = [
  { role: "admin", label: "Administration", to: "/admin", icon: ShieldCheck },
  { role: "conseiller", label: "Conseiller", to: "/conseiller", icon: Users },
  { role: "etudiant", label: "Étudiant", to: "/etudiant", icon: BookOpen },
  { role: "comptable", label: "Comptabilité", to: "/comptabilite", icon: Calculator },
  { role: "chef_projet", label: "Projets", to: "/projets", icon: FolderOpen },
  { role: "commercial", label: "Commercial", to: "/commercial", icon: BarChart3 },
];

export function AppShell({
  nav,
  children,
}: {
  nav: NavItem[];
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { data: auth } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const initials =
    (auth?.profile?.full_name || auth?.user?.email || "?")
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const otherSections = SECTION_LINKS.filter(
    (s) => auth?.roles?.includes(s.role) && !pathname.startsWith(s.to),
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center px-5">
          <Link to="/app">
            <BrandMark size="sm" variant="dark" />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => {
            const active =
              pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Multi-section switcher */}
        {otherSections.length > 0 && (
          <div className="border-t border-sidebar-border px-3 py-3">
            <div className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              Autres espaces
            </div>
            {otherSections.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <s.icon className="size-4" />
                {s.label}
              </Link>
            ))}
          </div>
        )}

        <div className="border-t border-sidebar-border p-4">
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="size-4" /> Déconnexion
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
          <div className="md:hidden">
            <BrandMark size="sm" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium leading-none">
                {auth?.profile?.full_name || auth?.user?.email}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                {auth?.role ? ROLE_LABEL[auth.role] : "—"}
              </div>
            </div>
            <div
              className="grid size-10 place-items-center rounded-full text-sm font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-hero)" }}
            >
              {initials}
            </div>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden">
          {nav.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className="size-3.5" />
                {item.label}
              </Link>
            );
          })}
          {/* Autres espaces en mobile */}
          {otherSections.length > 0 && (
            <>
              <div className="mx-1 my-auto h-4 w-px shrink-0 bg-border" />
              {otherSections.map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground/70 hover:bg-muted hover:text-foreground"
                >
                  <s.icon className="size-3.5" />
                  {s.label}
                </Link>
              ))}
            </>
          )}
          <button
            onClick={onLogout}
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-3.5" />
            Déconnexion
          </button>
        </nav>

        <main className="flex-1 p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
