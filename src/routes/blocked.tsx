import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldAlert, LogOut, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/blocked")({
  head: () => ({ meta: [{ title: "Compte en examen — Rézo Campus" }] }),
  component: BlockedPage,
});

function BlockedPage() {
  const navigate = useNavigate();
  const { data: auth } = useAuth();

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <img src="/1.png" alt="Rézo Campus" className="h-20 w-auto" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="size-7" />
          </div>

          <h1 className="font-display text-2xl font-semibold">Compte en examen</h1>

          <p className="mt-3 text-sm text-muted-foreground">
            Votre compte est temporairement suspendu et fait l'objet d'un examen
            par l'équipe Rézo Campus. Vous serez notifié dès que la situation
            sera résolue.
          </p>

          {auth?.user?.email && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
              <Mail className="size-4 shrink-0" />
              <span className="truncate">{auth.user.email}</span>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-left text-xs text-destructive/80">
            <p className="font-semibold">Pourquoi ce message ?</p>
            <p className="mt-1">
              L'accès à votre compte a été suspendu par un administrateur.
              Si vous pensez qu'il s'agit d'une erreur, contactez notre équipe.
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <a
              href="mailto:contact@rezoconnect.com"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-secondary"
            >
              <Mail className="size-4" /> Contacter le support
            </a>
            <button
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-destructive"
            >
              <LogOut className="size-4" /> Se déconnecter
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Rézo Campus Consulting · contact@rezoconnect.com
        </p>
      </div>
    </div>
  );
}
