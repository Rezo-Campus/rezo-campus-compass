import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, Globe2, ShieldCheck, Users, ChevronDown } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rézo Campus — Orientation académique pan-africaine | Casablanca · Brazzaville" },
      {
        name: "description",
        content:
          "Rézo Campus Consulting accompagne les étudiants africains vers les meilleures universités au Maroc et à l'international. Suivi de dossier, documents, conseiller dédié. Casablanca · Brazzaville.",
      },
      { property: "og:title", content: "Rézo Campus — Votre passerelle vers les meilleures universités" },
      { property: "og:description", content: "Accompagnement personnalisé des étudiants africains pour étudier au Maroc et à l'international. Depuis 2025." },
      { property: "og:image", content: "https://rezoboutique.shop/og-image.png" },
      { property: "og:url", content: "https://rezoboutique.shop" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://rezoboutique.shop/og-image.png" },
    ],
  }),
  component: Landing,
});

const FAQ_ITEMS = [
  {
    q: "Qui peut utiliser Rézo Campus ?",
    a: "Tout étudiant africain souhaitant poursuivre ses études au Maroc ou à l'international. Notre plateforme est accessible après inscription et validation par un conseiller.",
  },
  {
    q: "Comment fonctionne le suivi de dossier ?",
    a: "Après inscription, un conseiller dédié vous est attribué. Il suit votre dossier, valide vos documents et vous guide jusqu'à l'admission dans l'établissement cible.",
  },
  {
    q: "Quels documents dois-je fournir ?",
    a: "Pièce d'identité, diplômes, relevés de notes, lettre de motivation et CV. D'autres documents peuvent être demandés selon le pays et l'établissement visé.",
  },
  {
    q: "Où se trouvent vos bureaux ?",
    a: "Nous sommes présents physiquement à Casablanca (Maroc) et à Brazzaville (Congo). Nos conseillers accompagnent aussi les étudiants à distance.",
  },
  {
    q: "Combien coûte l'accompagnement ?",
    a: "Contactez-nous directement à campusrezo@gmail.com ou au +212 617-725 867 pour obtenir nos tarifs et formules d'accompagnement.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4 text-left text-sm font-medium transition hover:text-primary"
      >
        {q}
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="pb-4 text-sm text-muted-foreground">{a}</p>}
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          {/* Logo image */}
          <Link to="/" className="shrink-0">
            <img
              src="/1.png"
              alt="Rézo Campus Consulting"
              className="h-12 w-auto"
            />
          </Link>

          {/* Nav centrale */}
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
            <a
              href="#faq"
              className="text-foreground/65 transition hover:text-primary"
            >
              FAQ
            </a>
            <a
              href="#contact"
              className="text-foreground/65 transition hover:text-primary"
            >
              Contact
            </a>
            <a
              href="#politique"
              className="text-foreground/65 transition hover:text-primary"
            >
              Politique d'utilisation
            </a>
          </nav>

          {/* CTA */}
          <Link
            to="/login"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            Se connecter
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[oklch(0.97_0.01_200)]">
          {/* Décoration de fond */}
          <div
            className="absolute inset-0 -z-10"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 60% at 50% -20%, oklch(0.55 0.11 195 / 0.15) 0%, transparent 70%)",
            }}
          />
          <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
            <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center">
              <div className="max-w-3xl flex-1">
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                  <span className="size-1.5 rounded-full bg-accent" /> Casablanca · Brazzaville
                </span>
                <h1 className="mt-6 font-display text-4xl font-semibold leading-tight text-[oklch(0.22_0.055_210)] sm:text-6xl">
                  Votre passerelle vers les <span className="text-accent">meilleures universités</span>
                  <br />
                  au Maroc et à l'international.
                </h1>
                <p className="mt-6 max-w-2xl text-base text-[oklch(0.35_0.05_210)] sm:text-lg">
                  Rézo Campus Consulting accompagne les étudiants africains de bout en bout :
                  orientation, dossiers d'admission, visas et suivi personnalisé.
                </p>
                <p className="mt-2 text-sm font-medium text-primary">
                  Casablanca · Brazzaville
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                  <Link
                    to="/login"
                    className="group inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-90"
                  >
                    Accéder à mon espace
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <a
                    href="mailto:campusrezo@gmail.com"
                    className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-6 py-3 text-sm font-medium text-primary transition hover:bg-primary/10"
                  >
                    Nous contacter
                  </a>
                </div>
              </div>

              {/* Logo RC */}
              <div className="hidden shrink-0 lg:block">
                <img
                  src="/1.png"
                  alt="Rézo Campus Consulting — Depuis 2025"
                  width={260}
                  height={260}
                  className="drop-shadow-xl"
                />
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

      {/* ── FAQ ── */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
        <div className="mb-10 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Questions fréquentes</span>
          <h2 className="mt-2 font-display text-3xl font-semibold">Tout ce que vous voulez savoir</h2>
        </div>
        <div className="rounded-2xl border border-border bg-card px-6 shadow-[var(--shadow-soft)]">
          {FAQ_ITEMS.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="bg-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="mb-8 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Contact</span>
            <h2 className="mt-2 font-display text-3xl font-semibold">Parlons de votre projet</h2>
            <p className="mt-3 text-sm text-muted-foreground">Notre équipe est disponible pour répondre à toutes vos questions.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:campusrezo@gmail.com"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              campusrezo@gmail.com
            </a>
            <a
              href="tel:+212617725867"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold transition hover:bg-secondary"
            >
              +212 617-725 867
            </a>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            Bureaux : Casablanca (Maroc) · Brazzaville (Congo)
          </p>
        </div>
      </section>

      {/* ── Politique d'utilisation ── */}
      <section id="politique" className="mx-auto max-w-3xl px-6 py-20">
        <div className="mb-8 text-center">
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Légal</span>
          <h2 className="mt-2 font-display text-3xl font-semibold">Politique d'utilisation</h2>
        </div>
        <div className="space-y-6 rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground shadow-[var(--shadow-soft)]">
          <div>
            <h3 className="mb-2 font-semibold text-foreground">1. Objet</h3>
            <p>La plateforme Rézo Campus est réservée aux étudiants inscrits et au personnel de Rézo Campus Consulting. Tout accès non autorisé est interdit.</p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-foreground">2. Données personnelles</h3>
            <p>Les données collectées (identité, documents scolaires, coordonnées) sont utilisées exclusivement dans le cadre de votre accompagnement. Elles ne sont jamais revendues à des tiers.</p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-foreground">3. Documents téléversés</h3>
            <p>Les documents que vous déposez sur la plateforme sont stockés de manière sécurisée et ne sont accessibles qu'à votre conseiller assigné et à l'équipe d'administration.</p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-foreground">4. Responsabilité</h3>
            <p>Rézo Campus Consulting s'engage à mettre tout en œuvre pour accompagner votre projet. L'admission finale reste à la décision des établissements d'enseignement supérieur.</p>
          </div>
          <div>
            <h3 className="mb-2 font-semibold text-foreground">5. Contact</h3>
            <p>Pour toute question relative à vos données ou à cette politique, contactez-nous à <a href="mailto:campusrezo@gmail.com" className="text-primary underline underline-offset-2">campusrezo@gmail.com</a>.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <div className="flex items-center gap-3">
            <img src="/1.png" alt="Rézo Campus" className="h-8 w-auto opacity-80" />
            <span>© {new Date().getFullYear()} Rézo Campus Consulting</span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs">
            <a href="#faq" className="hover:text-primary transition">FAQ</a>
            <a href="#contact" className="hover:text-primary transition">Contact</a>
            <a href="#politique" className="hover:text-primary transition">Politique</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
