import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/unauthorized")({
  head: () => ({ meta: [{ title: "Accès refusé — Rézo Campus" }] }),
  component: () => (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="font-display text-2xl font-semibold">Accès non autorisé</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre compte n'a pas les permissions nécessaires pour accéder à cette section.
        </p>
        <Link
          to="/app"
          className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Retour à mon espace
        </Link>
      </div>
    </div>
  ),
});
