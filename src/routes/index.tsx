import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, GraduationCap, Globe2, ShieldCheck, Users, ChevronDown,
  UserPlus, User, BookOpen, FileText, School, Pencil, Send, CheckCircle2,
} from "lucide-react";
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
      { property: "og:image", content: "https://rezoconnect.com/og-image.png" },
      { property: "og:url", content: "https://rezoconnect.com" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://rezoconnect.com/og-image.png" },
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
    a: "Contactez-nous directement à contact@rezoconnect.com ou au +212 617-725 867 pour obtenir nos tarifs et formules d'accompagnement.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Inscription",
    desc: "Créez votre compte étudiant sur la plateforme Rézo Campus et accédez à votre espace personnel.",
    gradient: "from-rose-500 to-pink-400",
    shadow: "shadow-rose-200",
    icon: UserPlus,
  },
  {
    num: "02",
    title: "Profil personnel",
    desc: "Renseignez vos coordonnées : nom complet, téléphone, adresse et photo de profil.",
    gradient: "from-purple-600 to-purple-400",
    shadow: "shadow-purple-200",
    icon: User,
  },
  {
    num: "03",
    title: "Projet d'études",
    desc: "Précisez votre pays cible, le niveau d'études visé et la formation souhaitée.",
    gradient: "from-indigo-600 to-indigo-400",
    shadow: "shadow-indigo-200",
    icon: BookOpen,
  },
  {
    num: "04",
    title: "Parcours scolaire",
    desc: "Ajoutez vos diplômes obtenus avec justificatifs : attestation de diplôme + relevé de notes.",
    gradient: "from-sky-500 to-blue-400",
    shadow: "shadow-sky-200",
    icon: GraduationCap,
  },
  {
    num: "05",
    title: "Documents administratifs",
    desc: "Téléversez les pièces requises : pièce d'identité, CV et tout autre document complémentaire.",
    gradient: "from-cyan-500 to-teal-400",
    shadow: "shadow-cyan-200",
    icon: FileText,
  },
  {
    num: "06",
    title: "Choix des formations",
    desc: "Parcourez notre réseau d'établissements partenaires et sélectionnez les programmes qui correspondent à votre projet.",
    gradient: "from-emerald-500 to-green-400",
    shadow: "shadow-emerald-200",
    icon: School,
  },
  {
    num: "07",
    title: "Lettre de motivation",
    desc: "Rédigez votre lettre de motivation personnalisée directement depuis la plateforme pour chaque candidature.",
    gradient: "from-amber-500 to-orange-400",
    shadow: "shadow-amber-200",
    icon: Pencil,
  },
  {
    num: "08",
    title: "Soumission du dossier",
    desc: "Vérifiez votre dossier complet et transmettez-le en un clic à votre conseiller Rézo Campus.",
    gradient: "from-orange-500 to-red-400",
    shadow: "shadow-orange-200",
    icon: Send,
  },
  {
    num: "09",
    title: "Validation par le conseiller",
    desc: "Votre conseiller dédié examine votre dossier, valide vos pièces et vous guide si des corrections sont nécessaires.",
    gradient: "from-teal-600 to-cyan-500",
    shadow: "shadow-teal-200",
    icon: ShieldCheck,
  },
  {
    num: "10",
    title: "Transmission à l'école",
    desc: "Votre dossier validé est officiellement transmis aux établissements sélectionnés — l'aventure commence !",
    gradient: "from-rose-500 to-pink-400",
    shadow: "shadow-rose-200",
    icon: CheckCircle2,
  },
];

const FEATURES = [
  {
    icon: GraduationCap,
    title: "Suivi de dossier",
    text: "Avancement en temps réel de votre candidature, étape par étape.",
    bg: "bg-gradient-to-br from-blue-500 to-blue-600",
  },
  {
    icon: ShieldCheck,
    title: "Documents sécurisés",
    text: "Téléversement et validation centralisés par votre conseiller.",
    bg: "bg-gradient-to-br from-emerald-500 to-emerald-600",
  },
  {
    icon: Users,
    title: "Conseiller dédié",
    text: "Messagerie directe et rendez-vous avec un expert en orientation.",
    bg: "bg-gradient-to-br from-purple-500 to-purple-600",
  },
  {
    icon: Globe2,
    title: "Réseau pan-africain",
    text: "Présence physique à Casablanca et Brazzaville, partenaires partout en Afrique.",
    bg: "bg-gradient-to-br from-amber-500 to-orange-500",
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

type InfoTab = "faq" | "contact" | "politique";

function InfoSection() {
  const [tab, setTab] = useState<InfoTab>("faq");

  const tabs: { id: InfoTab; label: string }[] = [
    { id: "faq",       label: "Questions fréquentes" },
    { id: "contact",   label: "Nous contacter" },
    { id: "politique", label: "Politique d'utilisation" },
  ];

  return (
    <section id="faq" className="mx-auto max-w-4xl px-6 py-20">
      {/* Ancres secondaires */}
      <span id="contact" className="invisible block -mt-20 pt-20" />
      <span id="politique" className="invisible block" />

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]">

        {/* Onglets */}
        <div className="flex border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex-1 px-3 py-4 text-xs font-semibold transition sm:text-sm ${
                tab === t.id
                  ? "border-b-2 border-primary bg-primary/4 text-primary"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Contenu */}
        <div className="p-6 sm:p-8">

          {tab === "faq" && (
            <div>
              <p className="mb-6 text-sm text-muted-foreground">
                Retrouvez ici les réponses aux questions les plus fréquentes de nos étudiants.
              </p>
              {FAQ_ITEMS.map((item) => (
                <FaqItem key={item.q} q={item.q} a={item.a} />
              ))}
            </div>
          )}

          {tab === "contact" && (
            <div className="py-6 text-center">
              <p className="mb-2 font-display text-2xl font-semibold">Parlons de votre projet</p>
              <p className="mb-8 text-sm text-muted-foreground">
                Notre équipe est disponible pour répondre à toutes vos questions.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a
                  href="mailto:contact@rezoconnect.com"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
                >
                  contact@rezoconnect.com
                </a>
                <a
                  href="tel:+212617725867"
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-6 py-3 text-sm font-semibold transition hover:bg-muted"
                >
                  +212 617-725 867
                </a>
              </div>
              <p className="mt-8 text-xs text-muted-foreground">
                Bureaux : Casablanca (Maroc) · Brazzaville (Congo)
              </p>
            </div>
          )}

          {tab === "politique" && (
            <div className="space-y-5 text-sm text-muted-foreground">
              <p className="mb-2 font-display text-xl font-semibold text-foreground">Politique d'utilisation</p>
              <div>
                <h3 className="mb-1.5 font-semibold text-foreground">1. Objet</h3>
                <p>La plateforme Rézo Campus est réservée aux étudiants inscrits et au personnel de Rézo Campus Consulting. Tout accès non autorisé est interdit.</p>
              </div>
              <div>
                <h3 className="mb-1.5 font-semibold text-foreground">2. Données personnelles</h3>
                <p>Les données collectées (identité, documents scolaires, coordonnées) sont utilisées exclusivement dans le cadre de votre accompagnement. Elles ne sont jamais revendues à des tiers.</p>
              </div>
              <div>
                <h3 className="mb-1.5 font-semibold text-foreground">3. Documents téléversés</h3>
                <p>Les documents déposés sur la plateforme sont stockés de manière sécurisée et ne sont accessibles qu'à votre conseiller assigné et à l'équipe d'administration.</p>
              </div>
              <div>
                <h3 className="mb-1.5 font-semibold text-foreground">4. Responsabilité</h3>
                <p>Rézo Campus Consulting s'engage à mettre tout en œuvre pour accompagner votre projet. L'admission finale reste à la décision des établissements d'enseignement supérieur.</p>
              </div>
              <div>
                <h3 className="mb-1.5 font-semibold text-foreground">5. Contact</h3>
                <p>Pour toute question relative à vos données ou à cette politique, contactez-nous à{" "}
                  <a href="mailto:contact@rezoconnect.com" className="text-primary underline underline-offset-2">
                    contact@rezoconnect.com
                  </a>.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </section>
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
            <a href="#etapes" className="text-foreground/65 transition hover:text-primary">
              Comment ça marche
            </a>
            <a href="#faq" className="text-foreground/65 transition hover:text-primary">
              FAQ
            </a>
            <a href="#contact" className="text-foreground/65 transition hover:text-primary">
              Contact
            </a>
            <a href="#politique" className="text-foreground/65 transition hover:text-primary">
              Politique d'utilisation
            </a>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg border border-primary/30 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/5"
            >
              Se connecter
            </Link>
            <Link
              to="/login"
              search={{ mode: "signup" }}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#050e24] via-[#091b3e] to-[#040d1e]" />
          <div className="absolute left-1/3 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-blue-600/25 blur-[130px]" />
          <div className="absolute bottom-0 right-1/4 h-[450px] w-[450px] rounded-full bg-cyan-500/15 blur-[130px]" />
          <div className="absolute left-0 top-1/2 h-[320px] w-[320px] rounded-full bg-indigo-700/20 blur-[100px]" />

          <div className="relative mx-auto max-w-6xl px-6 py-24 sm:py-36">
            <div className="flex flex-col items-start gap-12 lg:flex-row lg:items-center">
              <div className="flex-1">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-4 py-1.5 text-xs font-medium text-blue-200 backdrop-blur-sm">
                  <span className="size-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  Casablanca · Brazzaville — Depuis 2025
                </span>

                <h1 className="mt-6 font-display text-4xl font-bold leading-[1.1] text-white sm:text-6xl">
                  Votre passerelle vers
                  <br />
                  <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-sky-300 bg-clip-text text-transparent">
                    les meilleures universités
                  </span>
                  <br />
                  au Maroc et à l'international.
                </h1>

                <p className="mt-6 max-w-xl text-base text-blue-100/70 sm:text-lg">
                  Rézo Campus Consulting accompagne les étudiants africains de bout en bout :
                  orientation, dossiers d'admission, visas et suivi personnalisé.
                </p>

                {/* Stats */}
                <div className="mt-8 flex flex-wrap gap-8 border-t border-white/10 pt-8">
                  {[
                    { val: "500+", label: "Étudiants accompagnés" },
                    { val: "50+",  label: "Établissements partenaires" },
                    { val: "2",    label: "Bureaux en Afrique" },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="text-2xl font-bold text-white">{s.val}</div>
                      <div className="mt-0.5 text-xs text-blue-200/55">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    to="/login"
                    className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:opacity-90"
                  >
                    Accéder à mon espace
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <a
                    href="mailto:contact@rezoconnect.com"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/8 px-6 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/15"
                  >
                    Nous contacter
                  </a>
                </div>
              </div>

              {/* Logo RC */}
              <div className="hidden shrink-0 lg:block">
                <div className="flex size-[280px] items-center justify-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl">
                  <img
                    src="/1.png"
                    alt="Rézo Campus Consulting"
                    width={200}
                    height={200}
                    className="drop-shadow-2xl brightness-0 invert"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* ── Services ── */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-12 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Nos services</span>
            <h2 className="mt-2 font-display text-3xl font-semibold text-foreground">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
              Une plateforme complète pour accompagner votre projet d'études à l'international.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]"
                style={{ backgroundImage: "var(--gradient-card)" }}
              >
                <div className={`mb-4 inline-grid size-12 place-items-center rounded-xl text-white shadow-sm ${f.bg}`}>
                  <f.icon className="size-6" />
                </div>
                <h3 className="text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>
              {/* ── Timeline ── */}
      <section id="etapes" className="overflow-hidden bg-[oklch(0.97_0.01_200)] py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <span className="text-xs font-semibold uppercase tracking-widest text-primary">Comment ça marche</span>
            <h2 className="mt-2 font-display text-3xl font-semibold text-[oklch(0.22_0.055_210)]">
              De l'inscription à l'admission
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              10 étapes simples pour concrétiser votre projet d'études à l'international
            </p>
          </div>

          {/* ── Desktop zigzag ── */}
          <div className="relative hidden lg:block">
            {/* Ligne verticale centrale */}
            <div className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 bg-gradient-to-b from-rose-300 via-indigo-300 via-cyan-300 to-rose-300 opacity-60" />

            <div className="space-y-14">
              {STEPS.map((step, i) => {
                const isLeft = i % 2 === 0;
                const Icon = step.icon;
                return (
                  <div key={step.num} className="relative flex items-center">
                    {/* Carte gauche / droite */}
                    <div className={`w-[44%] ${isLeft ? "pr-10 text-right" : "order-last pl-10 text-left"}`}>
                      <div className="inline-block max-w-xs rounded-2xl border border-border bg-white p-5 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg">
                        <div className={`mb-1 text-[11px] font-bold uppercase tracking-widest bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}>
                          Étape {step.num}
                        </div>
                        <h3 className="text-base font-semibold text-[oklch(0.22_0.055_210)]">{step.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>

                    {/* Spacer central */}
                    <div className="w-[12%]" />

                    {/* Cercle central avec icône */}
                    <div className="absolute left-1/2 -translate-x-1/2 z-10">
                      <div className={`flex size-16 items-center justify-center rounded-full bg-gradient-to-br ${step.gradient} shadow-lg ${step.shadow} ring-4 ring-white`}>
                        <Icon className="size-7 text-white" />
                      </div>
                      <div className="mt-1 text-center text-[10px] font-bold text-muted-foreground">{step.num}</div>
                    </div>

                    {/* Spacer droite (quand carte à gauche) ou gauche (quand carte à droite) */}
                    <div className={`w-[44%] ${isLeft ? "order-last" : "pr-10"}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Mobile liste verticale ── */}
          <div className="space-y-6 lg:hidden">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.num} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${step.gradient} shadow-md ${step.shadow} ring-3 ring-white`}>
                      <Icon className="size-5 text-white" />
                    </div>
                    <div className="mt-1 w-0.5 flex-1 bg-border" />
                  </div>
                  <div className="rounded-2xl border border-border bg-white p-4 shadow-sm mb-2 flex-1">
                    <div className={`mb-0.5 text-[11px] font-bold uppercase tracking-widest bg-gradient-to-r ${step.gradient} bg-clip-text text-transparent`}>
                      Étape {step.num}
                    </div>
                    <h3 className="text-sm font-semibold text-[oklch(0.22_0.055_210)]">{step.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-16 text-center">
            <Link
              to="/login"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg transition hover:opacity-90"
            >
              Commencer maintenant
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
      </main>

      {/* ── FAQ + Contact + Politique fusionnés ── */}
      <InfoSection />

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
