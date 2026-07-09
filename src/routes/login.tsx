import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, ArrowLeft, MailCheck, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/BrandMark";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Connexion — Rézo Campus" }] }),
  validateSearch: (search: Record<string, unknown>): { mode?: "signin" | "signup" } => {
    if (search.mode === "signup") return { mode: "signup" };
    if (search.mode === "signin") return { mode: "signin" };
    return {};
  },
  component: LoginPage,
});

/* ─── Détecte le token de récupération dans le hash de l'URL ─── */
function parseRecoveryHash(): boolean {
  const hash = window.location.hash;
  if (!hash) return false;
  const params = new URLSearchParams(hash.replace("#", "?"));
  return params.get("type") === "recovery" && !!params.get("access_token");
}

function LoginPage() {
  const navigate = useNavigate();
  const { mode: urlMode } = Route.useSearch();

  /* Si l'URL contient un token de récupération, on passe directement en mode "new-password" */
  const [mode, setMode] = useState<"signin" | "signup" | "reset" | "new-password">(
    () => (parseRecoveryHash() ? "new-password" : (urlMode ?? "signin"))
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  /* Redirige si déjà connecté (sauf si on vient de récupérer le mot de passe) */
  useEffect(() => {
    if (mode === "new-password") return;
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app", replace: true });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Google OAuth ── */
  async function signInWithGoogle() {
    setGoogleLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
  }

  /* ── Connexion / Inscription ── */
  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        toast.error("Connexion impossible", { description: error.message });
        return;
      }
      toast.success("Bienvenue !");
      navigate({ to: "/app", replace: true });
    } else {
      const { data: signupData, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      setLoading(false);
      if (error) {
        toast.error("Inscription impossible", { description: error.message });
        return;
      }
      if (signupData.session) {
        toast.success("Compte créé !", {
          description: "Votre accès sera activé par un administrateur.",
        });
        navigate({ to: "/app", replace: true });
      } else {
        toast.success("Compte créé", {
          description: "Vérifiez votre email pour confirmer votre compte.",
        });
        setMode("signin");
      }
    }
  };

  /* ── Demande de réinitialisation ── */
  const onReset = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      /* L'URL de redirection doit être whitelistée dans :
         Supabase Dashboard → Authentication → URL Configuration → Redirect URLs */
      redirectTo: `${window.location.origin}/login`,
    });
    setLoading(false);
    if (error) {
      /* Messages d'erreur clairs selon le contexte */
      let hint = error.message;
      if (error.message.toLowerCase().includes("rate limit") || error.message.toLowerCase().includes("sending")) {
        hint = "Limite d'envoi atteinte. Configurez un SMTP personnalisé dans Supabase (Settings → Auth → SMTP) ou réessayez dans 1 heure.";
      }
      toast.error("Envoi impossible", { description: hint, duration: 8000 });
    } else {
      setResetSent(true);
    }
  };

  /* ── Enregistrement du nouveau mot de passe ── */
  const onSetNewPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (error) {
      toast.error("Erreur", { description: error.message });
      return;
    }
    toast.success("Mot de passe mis à jour !", { description: "Vous allez être redirigé." });
    /* Nettoyer le hash et rediriger */
    window.history.replaceState(null, "", window.location.pathname);
    navigate({ to: "/app", replace: true });
  };

  /* ══════════════════════════════════════════════════════════════ */

  return (
    <div className="grid min-h-screen lg:grid-cols-2">

      {/* ── Panneau gauche ── */}
      <div
        className="relative hidden flex-col justify-between p-10 text-primary-foreground lg:flex"
        style={{ background: "var(--gradient-hero)" }}
      >
        <Link to="/"><BrandMark /></Link>
        <div className="max-w-md">
          <h2 className="font-display text-3xl font-semibold leading-tight">
            Votre orientation académique, structurée et accompagnée.
          </h2>
          <p className="mt-4 text-white/80">
            Connectez-vous à votre espace pour suivre votre dossier, échanger avec votre
            conseiller et accéder à vos rendez-vous.
          </p>
        </div>
        <p className="text-xs text-white/60">© Rézo Campus Consulting</p>
      </div>

      {/* ── Panneau droit ── */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>

          {/* ════════════════════════════════════
              MODE : Nouveau mot de passe (après clic dans l'email)
          ════════════════════════════════════ */}
          {mode === "new-password" && (
            <>
              <div className="mb-5 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-semibold tracking-tight">
                    Nouveau mot de passe
                  </h1>
                  <p className="text-sm text-muted-foreground">Choisissez un nouveau mot de passe sécurisé.</p>
                </div>
              </div>

              <form onSubmit={onSetNewPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    >
                      {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Minimum 6 caractères.</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading || newPassword.length < 6}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Enregistrer le nouveau mot de passe
                </Button>
              </form>
            </>
          )}

          {/* ════════════════════════════════════
              MODE : Réinitialisation (envoi de l'email)
          ════════════════════════════════════ */}
          {mode === "reset" && (
            <>
              <button
                onClick={() => { setMode("signin"); setResetSent(false); setResetEmail(""); }}
                className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition"
              >
                <ArrowLeft className="size-4" /> Retour à la connexion
              </button>

              <h1 className="font-display text-2xl font-semibold tracking-tight">
                Mot de passe oublié
              </h1>

              {resetSent ? (
                <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-6 text-center">
                  <MailCheck className="size-10 text-green-500" />
                  <p className="font-semibold text-green-800">E-mail envoyé !</p>
                  <p className="text-sm text-green-700">
                    Vérifiez votre boîte de réception. Cliquez sur le lien reçu pour définir
                    un nouveau mot de passe. Il expire dans <strong>1 heure</strong>.
                  </p>
                  <button
                    className="mt-2 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    onClick={() => { setResetSent(false); setResetEmail(""); }}
                  >
                    Renvoyer un lien
                  </button>
                </div>
              ) : (
                <>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Entrez votre adresse e-mail et nous vous enverrons un lien pour créer un
                    nouveau mot de passe.
                  </p>
                  <form onSubmit={onReset} className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="resetEmail">Adresse e-mail</Label>
                      <Input
                        id="resetEmail"
                        type="email"
                        required
                        autoComplete="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="vous@exemple.com"
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                      Envoyer le lien de réinitialisation
                    </Button>
                  </form>
                </>
              )}
            </>
          )}

          {/* ════════════════════════════════════
              MODE : Connexion / Inscription
          ════════════════════════════════════ */}
          {(mode === "signin" || mode === "signup") && (
            <>
              {/* Onglets */}
              <div className="mb-6 inline-flex rounded-lg border border-border bg-muted/40 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`rounded-md px-4 py-1.5 font-medium transition ${mode === "signin" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                >
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`rounded-md px-4 py-1.5 font-medium transition ${mode === "signup" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
                >
                  Créer un compte
                </button>
              </div>

              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {mode === "signin" ? "Connexion" : "Créer un compte"}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {mode === "signin"
                  ? "Accédez à votre espace Rézo Campus."
                  : "Renseignez vos informations pour démarrer."}
              </p>

              {/* Bouton Google */}
              <div className="mt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 font-medium"
                  onClick={signInWithGoogle}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <svg className="size-4 shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                  )}
                  {mode === "signin" ? "Se connecter avec Google" : "Continuer avec Google"}
                </Button>
              </div>

              <div className="relative my-5 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Formulaire email / mot de passe */}
              <form onSubmit={onSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Nom complet</Label>
                    <Input
                      id="fullName"
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Prénom Nom"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Adresse e-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mot de passe</Label>
                    {mode === "signin" && (
                      <button
                        type="button"
                        onClick={() => setMode("reset")}
                        className="text-xs text-muted-foreground underline-offset-2 hover:text-primary hover:underline transition"
                      >
                        Mot de passe oublié ?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {mode === "signup" && (
                    <p className="text-xs text-muted-foreground">Minimum 6 caractères.</p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {mode === "signin" ? "Se connecter" : "Créer mon compte"}
                </Button>
              </form>

              {mode === "signup" && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
                  Un e-mail de confirmation vous sera envoyé. Un administrateur doit ensuite
                  activer votre accès avant que vous puissiez vous connecter.
                </p>
              )}
            </>
          )}

          <p className="mt-6 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Besoin d'aide ? Contactez{" "}
            <a
              href="mailto:contact@rezoconnect.com"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              contact@rezoconnect.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
