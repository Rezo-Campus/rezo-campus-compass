import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, LogOut, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({ meta: [{ title: "En attente d'accès — Rézo Campus" }] }),
  component: PendingAccess,
});

function PendingAccess() {
  const navigate = useNavigate();
  const { data: auth } = useAuth();

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <img src="/1.png" alt="Rézo Campus" className="h-20 w-auto" />
        </div>

        <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
          {/* Icône d'attente */}
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
            <Clock className="size-7" />
          </div>

          <h1 className="font-display text-2xl font-semibold">Compte en attente</h1>

          <p className="mt-3 text-sm text-muted-foreground">
            Votre compte a bien été créé. Un administrateur Rézo Campus va vérifier
            votre inscription et vous attribuer votre accès sous peu.
          </p>

          {auth?.user?.email && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
              <Mail className="size-4 shrink-0" />
              <span className="truncate">{auth.user.email}</span>
            </div>
          )}

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-xs text-amber-800">
            <p className="font-semibold">Que se passe-t-il ensuite ?</p>
            <ol className="mt-2 space-y-1 list-decimal list-inside">
              <li>L'équipe Rézo Campus vérifie votre inscription</li>
              <li>Un rôle vous est attribué (étudiant ou conseiller)</li>
              <li>Reconnectez-vous pour accéder à votre espace</li>
            </ol>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <a
              href="mailto:contact@rezoconnect.com"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition hover:bg-secondary"
            >
              <Mail className="size-4" /> Contacter l'équipe
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
