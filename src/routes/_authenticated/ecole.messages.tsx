import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Thread } from "./etudiant.messages";

export const Route = createFileRoute("/_authenticated/ecole/messages")({
  component: EcoleMessages,
});

function EcoleMessages() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const schoolId = auth?.profile?.school_id;

  const { data: contacts = [] } = useQuery({
    enabled: !!uid && !!schoolId,
    queryKey: ["ecole-contacts-messages", schoolId],
    queryFn: async () => {
      const { data: apps } = await supabase
        .from("student_applications")
        .select("student_id")
        .eq("school_id", schoolId!);

      const studentIds = [...new Set((apps ?? []).map((a) => a.student_id))];

      // Include anyone who already wrote to this school
      const { data: msgs } = await supabase
        .from("messages")
        .select("sender_id, recipient_id")
        .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`);
      msgs?.forEach((m) => {
        if (m.sender_id !== uid) studentIds.push(m.sender_id);
        if (m.recipient_id !== uid) studentIds.push(m.recipient_id);
      });

      const uniqIds = [...new Set(studentIds)].filter(Boolean);
      if (!uniqIds.length) return [];

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email, photo_url")
        .in("id", uniqIds);
      return profs ?? [];
    },
  });

  const [peer, setPeer] = useState<string | null>(null);
  useEffect(() => {
    if (!peer && contacts.length) setPeer(contacts[0].id);
  }, [contacts, peer]);

  return (
    <>
      <PageHeader
        eyebrow="Espace École"
        title="Messagerie"
        description="Échangez avec vos candidats directement."
      />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Panel title="Candidats">
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun candidat. Les étudiants apparaissent ici après avoir postulé.
            </p>
          ) : (
            <ul className="space-y-1">
              {contacts.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setPeer(c.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                      peer === c.id
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    {c.photo_url ? (
                      <img
                        src={c.photo_url}
                        alt={c.full_name ?? ""}
                        className="size-8 rounded-full object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {(c.full_name || c.email || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {c.full_name || c.email}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.email}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <div>{peer && uid && <Thread me={uid} peer={peer} />}</div>
      </div>
    </>
  );
}
