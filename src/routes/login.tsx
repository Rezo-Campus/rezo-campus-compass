import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
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

function LoginPage() {
  const navigate = useNavigate();
  const { mode: urlMode } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">(urlMode ?? "signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app", replace: true });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
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

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>

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

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
              <Label htmlFor="email">Adresse email</Label>
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
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mode === "signin" ? "Se connecter" : "Créer mon compte"}
            </Button>
          </form>

          <p className="mt-6 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Besoin d'aide ? Contactez{" "}
            <a href="mailto:campusrezo@gmail.com" className="font-medium text-primary underline-offset-2 hover:underline">
              campusrezo@gmail.com
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
