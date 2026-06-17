import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Loader2, GraduationCap, ChevronRight, Mail, Phone, Search,
} from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/secretaire/etudiants/")({
  component: SecretaireEtudiants,
});

function SecretaireEtudiants() {
  const [search, setSearch] = useState("");

  const { data: students = [], isLoading } = useQuery({
    queryKey: ["secretaire-students"],
    queryFn: async () => {
      const { data: roleRows, error: roleErr } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "etudiant");
      if (roleErr) throw roleErr;

      const studentIds = roleRows.map((r) => r.user_id);
      if (!studentIds.length) return [];

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, photo_url")
        .in("id", studentIds)
        .order("full_name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = students.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.full_name ?? "").toLowerCase().includes(q) ||
      (s.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <PageHeader
        eyebrow="Secrétariat"
        title="Profils étudiants"
        description="Consultez les profils et dossiers de tous les étudiants."
      />

      {/* Recherche */}
      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Rechercher par nom ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Panel title={`${filtered.length} étudiant${filtered.length !== 1 ? "s" : ""}`}>
        {isLoading ? (
          <Loader2 className="mx-auto size-5 animate-spin text-primary" />
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
            <GraduationCap className="mx-auto mb-3 size-10 text-muted-foreground/30" />
            {search ? "Aucun étudiant correspondant à la recherche." : "Aucun étudiant enregistré."}
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((s) => (
              <li key={s.id}>
                <Link
                  to="/secretaire/etudiants/$studentId"
                  params={{ studentId: s.id }}
                  className="flex items-center gap-4 rounded-xl border border-border p-4 transition hover:border-primary/40 hover:bg-muted/30"
                >
                  {s.photo_url ? (
                    <img
                      src={s.photo_url}
                      alt={s.full_name ?? ""}
                      className="size-11 rounded-full object-cover border border-border shrink-0"
                    />
                  ) : (
                    <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary border border-border">
                      <GraduationCap className="size-5" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{s.full_name || "—"}</div>
                    <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground mt-0.5">
                      {s.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="size-3" /> {s.email}
                        </span>
                      )}
                      {s.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3" /> {s.phone}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                    Voir le dossier <ChevronRight className="size-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
