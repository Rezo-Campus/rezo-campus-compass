import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LogOut, Users, BookOpen, Calculator, FolderOpen, BarChart3,
  ShieldCheck, UserCheck, School, Briefcase, Layers,
  CalendarDays, CalendarClock, Receipt, Calendar, ArrowLeftRight,
  ClipboardList, TrendingUp, FileSignature, MoreHorizontal,
} from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { useRef, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { NotificationsBell } from "@/components/NotificationsBell";

export interface NavItem {
  label: string;
  to: string;
  icon: ComponentType<{ className?: string }>;
}

export const ROLE_LABEL: Record<AppRole, string> = {
  etudiant:    "Étudiant",
  conseiller:  "Conseiller",
  admin:       "Administrateur",
  comptable:   "Comptable",
  chef_projet: "Chef de projet",
  commercial:  "Commercial",
  rh:          "Ressources Humaines",
  ecole:       "Établissement",
  secretaire:  "Secrétaire Particulière",
  aadf:        "AADF",
};

/* ── Identité visuelle par rôle ── */
const ROLE_COLORS: Record<AppRole, {
  gradFrom: string; gradTo: string;
  accent: string;   dot: string;
  mobileActive: string;
}> = {
  etudiant:    { gradFrom: "#0c4a6e", gradTo: "#0f172a", accent: "#0ea5e9", dot: "#38bdf8",  mobileActive: "#0284c7" },
  conseiller:  { gradFrom: "#064e3b", gradTo: "#0f172a", accent: "#10b981", dot: "#34d399",  mobileActive: "#059669" },
  admin:       { gradFrom: "#3b0764", gradTo: "#0f172a", accent: "#a855f7", dot: "#c084fc",  mobileActive: "#9333ea" },
  ecole:       { gradFrom: "#78350f", gradTo: "#0f172a", accent: "#f59e0b", dot: "#fcd34d",  mobileActive: "#d97706" },
  comptable:   { gradFrom: "#1e293b", gradTo: "#0f172a", accent: "#64748b", dot: "#94a3b8",  mobileActive: "#475569" },
  chef_projet: { gradFrom: "#1e1b4b", gradTo: "#0f172a", accent: "#6366f1", dot: "#818cf8",  mobileActive: "#4f46e5" },
  commercial:  { gradFrom: "#431407", gradTo: "#0f172a", accent: "#f97316", dot: "#fdba74",  mobileActive: "#ea580c" },
  rh:          { gradFrom: "#4c0519", gradTo: "#0f172a", accent: "#f43f5e", dot: "#fda4af",  mobileActive: "#e11d48" },
  secretaire:  { gradFrom: "#083344", gradTo: "#0f172a", accent: "#06b6d4", dot: "#67e8f9",  mobileActive: "#0891b2" },
  aadf:        { gradFrom: "#042f2e", gradTo: "#0f172a", accent: "#14b8a6", dot: "#2dd4bf",  mobileActive: "#0d9488" },
};

const SECTION_LINKS: {
  role: AppRole; label: string; to: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  { role: "admin",       label: "Administration",       to: "/admin",        icon: ShieldCheck },
  { role: "conseiller",  label: "Conseiller",            to: "/conseiller",   icon: Users },
  { role: "etudiant",    label: "Étudiant",              to: "/etudiant",     icon: BookOpen },
  { role: "comptable",   label: "Comptabilité",          to: "/comptabilite", icon: Calculator },
  { role: "chef_projet", label: "Projets",               to: "/projets",      icon: FolderOpen },
  { role: "commercial",  label: "Commercial",            to: "/commercial",   icon: BarChart3 },
  { role: "rh",          label: "Ressources Humaines",   to: "/rh",           icon: UserCheck },
  { role: "ecole",       label: "Espace École",          to: "/ecole",        icon: School },
  { role: "secretaire",  label: "Secrétariat",           to: "/secretaire",   icon: Briefcase },
  { role: "aadf",        label: "AADF",                  to: "/aadf",         icon: Layers },
];

/* ── Accès rapides par rôle (menu 3-points dans le topbar) ── */
const ROLE_QUICK_ACTIONS: Partial<Record<AppRole, {
  label: string; to: string; icon: ComponentType<{ className?: string }>;
}[]>> = {
  secretaire:  [
    { label: "Agenda",       to: "/secretaire/agenda",         icon: Calendar },
    { label: "Rendez-vous",  to: "/secretaire/rendez-vous",    icon: CalendarClock },
    { label: "Réunions",     to: "/secretaire/reunions",       icon: CalendarDays },
    { label: "Facturation",  to: "/secretaire/facturation",    icon: Receipt },
  ],
  comptable: [
    { label: "Réunions", to: "/comptabilite/reunions", icon: CalendarDays },
  ],
  rh: [
    { label: "Agenda",     to: "/rh/agenda",     icon: Calendar },
    { label: "Contrats",   to: "/rh/contrats",   icon: FileSignature },
    { label: "Entretiens", to: "/rh/entretiens", icon: UserCheck },
    { label: "Réunions",   to: "/rh/reunions",   icon: CalendarDays },
  ],
  commercial: [
    { label: "Agenda",    to: "/commercial/agenda",              icon: Calendar },
    { label: "Marketing", to: "/commercial/marketing",           icon: TrendingUp },
    { label: "RDV",       to: "/commercial/rendez-vous-clients", icon: CalendarClock },
    { label: "Réunions",  to: "/commercial/reunions",            icon: CalendarDays },
  ],
  chef_projet: [
    { label: "Agenda",       to: "/projets/agenda",      icon: Calendar },
    { label: "Projets",      to: "/projets/liste",        icon: FolderOpen },
    { label: "Analytiques",  to: "/projets/analytiques",  icon: TrendingUp },
    { label: "Réunions",     to: "/projets/reunions",     icon: CalendarDays },
  ],
  admin: [
    { label: "Utilisateurs", to: "/admin/utilisateurs", icon: Users },
    { label: "Dossiers",     to: "/admin/dossiers",      icon: FolderOpen },
    { label: "Réunions",     to: "/admin/reunions",      icon: CalendarDays },
    { label: "Facturation",  to: "/admin/facturation",   icon: Receipt },
  ],
};

/* ── Menu 3-points accès rapides ── */
function QuickActionsMenu({ role, C }: { role: AppRole | undefined; C: typeof ROLE_COLORS[AppRole] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const actions = role ? (ROLE_QUICK_ACTIONS[role] ?? []) : [];

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (actions.length === 0) return null;

  return (
    <div ref={ref} className="relative print:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label="Actions rapides"
      >
        <MoreHorizontal className="size-5" />
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-[200] w-52 overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Accès rapides
            </p>
          </div>
          <div className="p-1.5">
            {actions.map((a) => (
              <Link
                key={a.to}
                to={a.to as any}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted/60"
              >
                <span className="grid size-7 place-items-center rounded-lg" style={{ background: `${C.accent}18`, color: C.accent }}>
                  <a.icon className="size-3.5" />
                </span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppShell({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  const navigate   = useNavigate();
  const { data: auth } = useAuth();
  const pathname   = useRouterState({ select: (s) => s.location.pathname });

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  const initials = (auth?.profile?.full_name || auth?.user?.email || "?")
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const otherSections = SECTION_LINKS.filter(
    (s) => auth?.roles?.includes(s.role) && !pathname.startsWith(s.to),
  );

  const role      = auth?.role as AppRole | undefined;
  const C         = role ? ROLE_COLORS[role] : ROLE_COLORS.etudiant;
  const roleLabel = role ? ROLE_LABEL[role] : "—";

  const currentPage = nav.find(
    (item) => pathname === item.to || pathname.startsWith(item.to + "/"),
  )?.label;

  return (
    <div className="flex min-h-screen bg-background print:block print:min-h-0">

      {/* ══════════════ SIDEBAR DESKTOP ══════════════ */}
      <aside
        className="hidden w-64 shrink-0 flex-col md:flex print:hidden"
        style={{ background: `linear-gradient(170deg, ${C.gradFrom} 0%, ${C.gradTo} 100%)` }}
      >

        {/* Logo */}
        <div className="flex h-[68px] items-center gap-3 px-5 border-b border-white/10">
          <Link to="/app" className="flex items-center gap-3 min-w-0">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${C.accent}30`, border: `1px solid ${C.accent}40` }}
            >
              <img src="/1.png" alt="RC" className="size-6 w-auto brightness-0 invert" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-bold tracking-wider text-white leading-tight truncate">
                RÉZO CAMPUS
              </div>
              <div className="text-[10px] font-medium text-white/40 truncate">Consulting</div>
            </div>
          </Link>
        </div>

        {/* Badge de rôle */}
        <div className="px-4 pt-4 pb-1">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold backdrop-blur-sm"
            style={{
              background: `${C.accent}18`,
              color: C.dot,
              border: `1px solid ${C.accent}35`,
            }}
          >
            <span className="size-1.5 rounded-full animate-pulse" style={{ background: C.dot }} />
            Espace {roleLabel}
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {nav.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                  active
                    ? "text-white"
                    : "text-white/58 hover:bg-white/10 hover:text-white/90"
                }`}
                style={
                  active
                    ? {
                        background: `${C.accent}22`,
                        borderLeft: `3px solid ${C.dot}`,
                        padding: "10px 12px 10px 9px",
                      }
                    : { padding: "10px 12px" }
                }
              >
                <span className="size-4 shrink-0" style={{ color: active ? C.dot : undefined }}>
                  <item.icon className="size-4" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Autres espaces */}
        {otherSections.length > 0 && (
          <div className="border-t border-white/10 px-3 py-3">
            <div className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.15em] text-white/30">
              Autres espaces
            </div>
            {otherSections.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className="flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-white/45 transition hover:bg-white/10 hover:text-white/80"
              >
                <s.icon className="size-3.5 shrink-0" />
                {s.label}
              </Link>
            ))}
          </div>
        )}

        {/* User card */}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)" }}>
            {auth?.profile?.photo_url ? (
              <img
                src={auth.profile.photo_url}
                alt={auth.profile.full_name ?? "Profil"}
                className="size-9 rounded-full object-cover shrink-0"
                style={{ boxShadow: `0 0 0 2px ${C.dot}60` }}
              />
            ) : (
              <div
                className="grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${C.gradFrom}, ${C.accent})` }}
              >
                {initials}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-white leading-tight">
                {auth?.profile?.full_name || auth?.user?.email}
              </div>
              <div className="mt-0.5 truncate text-[10px] text-white/45">
                {auth?.user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[11px] font-medium text-white/40 transition hover:bg-white/10 hover:text-white/70"
          >
            <LogOut className="size-3.5" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ══════════════ MAIN AREA ══════════════ */}
      <div className="flex min-w-0 flex-1 flex-col print:w-full print:flex-none">

        {/* ── Topbar ── */}
        <header className="sticky top-0 z-30 flex h-[68px] items-center justify-between border-b border-border bg-card/90 px-5 backdrop-blur-sm print:hidden">

          {/* Left — mobile logo + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile: logo inline */}
            <div className="flex items-center gap-2 md:hidden">
              <div
                className="flex size-8 items-center justify-center rounded-lg"
                style={{ background: `linear-gradient(135deg, ${C.gradFrom}, ${C.accent})` }}
              >
                <img src="/1.png" alt="RC" className="size-5 w-auto brightness-0 invert" />
              </div>
              <span className="text-[13px] font-bold tracking-wide">Rézo Campus</span>
            </div>

            {/* Desktop: breadcrumb */}
            {currentPage && (
              <div className="hidden md:flex items-center gap-2 text-sm">
                <span className="text-muted-foreground/40">/</span>
                <span className="font-medium text-foreground">{currentPage}</span>
              </div>
            )}
          </div>

          {/* Right — quick actions + bell + user */}
          <div className="flex items-center gap-3">
            <QuickActionsMenu role={role} C={C} />
            <NotificationsBell />

            <div className="hidden sm:flex items-center gap-2.5 rounded-xl border border-border bg-muted/30 px-3 py-1.5">
              <div className="text-right leading-none">
                <div className="text-[13px] font-semibold text-foreground">
                  {auth?.profile?.full_name || auth?.user?.email}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{roleLabel}</div>
              </div>
              {auth?.profile?.photo_url ? (
                <img
                  src={auth.profile.photo_url}
                  alt={auth.profile.full_name ?? "Profil"}
                  className="size-8 rounded-full object-cover shrink-0"
                  style={{ boxShadow: `0 0 0 2px ${C.accent}60` }}
                />
              ) : (
                <div
                  className="grid size-8 place-items-center rounded-full text-[12px] font-bold text-white shrink-0"
                  style={{ background: `linear-gradient(135deg, ${C.gradFrom}, ${C.accent})` }}
                >
                  {initials}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Mobile nav ── */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden print:hidden">
          {nav.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition ${
                  active ? "text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                style={active ? { background: `linear-gradient(135deg, ${C.gradFrom}, ${C.accent})` } : undefined}
              >
                <item.icon className="size-3.5 shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {otherSections.length > 0 && (
            <>
              <div className="mx-1 my-auto h-4 w-px shrink-0 bg-border" />
              {otherSections.map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground/70 hover:bg-muted hover:text-foreground"
                >
                  <s.icon className="size-3.5" />
                  {s.label}
                </Link>
              ))}
            </>
          )}

          <button
            onClick={onLogout}
            className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10"
          >
            <LogOut className="size-3.5" />
            Quitter
          </button>
        </nav>

        {/* ── Page content ── */}
        <main className="flex-1 p-6 lg:p-10 print:p-0">{children}</main>

        {/* ── Footer app ── */}
        <footer className="border-t border-border/40 bg-card/60 px-6 py-3 print:hidden">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/50">
            <span>© {new Date().getFullYear()} Rézo Campus Consulting</span>
            <span className="hidden sm:block">Casablanca · Brazzaville</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
