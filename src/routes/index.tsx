import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, Globe2, ShieldCheck, Users } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rézo Campus — Orientation académique pan-africaine" },
      {
        name: "description",
        content:
          "Plateforme d'accompagnement des étudiants africains pour étudier au Maroc et à l'international. Casablanca · Brazzaville.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <BrandMark />
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary"
          >
            Se connecter
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div
            className="absolute inset-0 -z-10 opacity-90"
            style={{ background: "var(--gradient-hero)" }}
          />
          <div
            className="absolute inset-0 -z-10 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, white 0, transparent 40%), radial-gradient(circle at 80% 80%, white 0, transparent 40%)",
            }}
          />
          <div className="mx-auto max-w-6xl px-6 py-24 text-primary-foreground sm:py-32">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
                <span className="size-1.5 rounded-full bg-accent" /> Casablanca · Brazzaville
              </span>
              <h1 className="mt-6 font-display text-4xl font-semibold leading-tight sm:text-6xl">
                Votre passerelle vers les <span className="text-accent">meilleures universités</span>
                <br />
                au Maroc et à l'international.
              </h1>
              <p className="mt-6 max-w-2xl text-base text-white/85 sm:text-lg">
                Rézo Campus Consulting accompagne les étudiants africains de bout en bout :
                orientation, dossiers d'admission, visas et suivi personnalisé.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link
                  to="/login"
                  className="group inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground shadow-[var(--shadow-elegant)] transition hover:brightness-110"
                >
                  Accéder à mon espace
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a
                  href="mailto:campusrezo@gmail.com"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10"
                >
                  Nous contacter
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: GraduationCap,
                title: "Suivi de dossier",
                text: "Avancement en temps réel de votre candidature, étape par étape.",
              },
              {
                icon: ShieldCheck,
                title: "Documents sécurisés",
                text: "Téléversement et validation centralisés par votre conseiller.",
              },
              {
                icon: Users,
                title: "Conseiller dédié",
                text: "Messagerie directe et rendez-vous avec un expert orientation.",
              },
              {
                icon: Globe2,
                title: "Réseau pan-africain",
                text: "Présence physique à Casablanca et Brazzaville, partenaires partout en Afrique.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-elegant)]"
                style={{ backgroundImage: "var(--gradient-card)" }}
              >
                <div className="mb-4 inline-grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <f.icon className="size-5" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <div>© {new Date().getFullYear()} Rézo Campus Consulting</div>
          <div>campusrezo@gmail.com · +212 617-725 867</div>
        </div>
      </footer>
    </div>
  );
}
