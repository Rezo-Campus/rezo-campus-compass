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
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirige déjà-connecté vers le hub.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/app", replace: true });
    });
  }, [navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Connexion impossible", { description: error.message });
      return;
    }
    toast.success("Bienvenue !");
    navigate({ to: "/app", replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Côté visuel */}
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

      {/* Formulaire */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <BrandMark />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Connexion</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Accédez à votre espace Rézo Campus.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Se connecter
            </Button>
          </form>

          <p className="mt-6 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            Les accès sont délivrés par l'administrateur Rézo Campus. Si vous n'avez pas
            encore de compte, contactez{" "}
            <a href="mailto:campusrezo@gmail.com" className="font-medium text-primary underline-offset-2 hover:underline">
              campusrezo@gmail.com
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
