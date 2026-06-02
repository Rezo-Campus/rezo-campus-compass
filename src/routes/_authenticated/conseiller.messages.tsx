import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Thread } from "./etudiant.messages";

export const Route = createFileRoute("/_authenticated/conseiller/messages")({
  component: MessagesConseiller,
});

function MessagesConseiller() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const isAdmin = auth?.role === "admin";

  const { data: contacts = [] } = useQuery({
    enabled: !!uid,
    queryKey: ["conseiller-contacts", uid, isAdmin],
    queryFn: async () => {
      // Étudiants assignés + tous les étudiants/staff ayant écrit ou reçu un message
      const ids = new Set<string>();

      if (isAdmin) {
        const { data: all } = await supabase.from("user_roles").select("user_id").neq("user_id", uid!);
        all?.forEach((r) => ids.add(r.user_id));
      } else {
        const { data: assigned } = await supabase
          .from("student_files")
          .select("student_id")
          .eq("advisor_id", uid!);
        assigned?.forEach((s) => ids.add(s.student_id));
      }

      const { data: msgs } = await supabase
        .from("messages")
        .select("sender_id, recipient_id")
        .or(`sender_id.eq.${uid},recipient_id.eq.${uid}`);
      msgs?.forEach((m) => {
        if (m.sender_id !== uid) ids.add(m.sender_id);
        if (m.recipient_id !== uid) ids.add(m.recipient_id);
      });

      if (!ids.size) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", [...ids]);
      return profs ?? [];
    },
  });

  const [peer, setPeer] = useState<string | null>(null);
  useEffect(() => {
    if (!peer && contacts.length) setPeer(contacts[0].id);
  }, [contacts, peer]);

  return (
    <>
      <PageHeader eyebrow="Messagerie" title="Conversations" />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Panel title="Contacts">
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun contact.</p>
          ) : (
            <ul className="space-y-1">
              {contacts.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setPeer(c.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      peer === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium">{c.full_name || c.email}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
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
