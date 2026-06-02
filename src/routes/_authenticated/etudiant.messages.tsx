import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/dashboard-bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/etudiant/messages")({
  component: MessagesEtudiant,
});

function MessagesEtudiant() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;

  // Récupère destinataires possibles : conseillers et admins
  const { data: staff = [] } = useQuery({
    queryKey: ["staff-list"],
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["conseiller", "admin"]);
      if (error) throw error;
      const ids = roles.map((r) => r.user_id);
      if (!ids.length) return [];
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      return (profs ?? []).map((p) => ({
        ...p,
        role: roles.find((r) => r.user_id === p.id)?.role as AppRole,
      }));
    },
  });

  const [peer, setPeer] = useState<string | null>(null);

  useEffect(() => {
    if (!peer && staff.length) setPeer(staff[0].id);
  }, [staff, peer]);

  return (
    <>
      <PageHeader eyebrow="Messagerie" title="Échanges avec l'équipe Rézo Campus" />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Panel title="Contacts">
          {staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun contact disponible.</p>
          ) : (
            <ul className="space-y-1">
              {staff.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setPeer(s.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                      peer === s.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium">{s.full_name || s.email}</div>
                    <div className="text-xs text-muted-foreground capitalize">{s.role}</div>
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

export function Thread({ me, peer }: { me: string; peer: string }) {
  const qc = useQueryClient();
  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const key = useMemo(() => ["thread", me, peer], [me, peer]);

  const { data: messages = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${me},recipient_id.eq.${peer}),and(sender_id.eq.${peer},recipient_id.eq.${me})`)
        .order("created_at");
      if (error) throw error;
      // Marquer comme lus ceux reçus de peer
      const unread = data.filter((m) => m.recipient_id === me && !m.read_at).map((m) => m.id);
      if (unread.length) {
        await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread);
      }
      return data;
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${me}-${peer}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as { sender_id: string; recipient_id: string };
          if (
            (m.sender_id === me && m.recipient_id === peer) ||
            (m.sender_id === peer && m.recipient_id === me)
          ) {
            qc.invalidateQueries({ queryKey: key });
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me, peer, qc, key]);

  const send = useMutation({
    mutationFn: async () => {
      if (!body.trim()) return;
      const { error } = await supabase
        .from("messages")
        .insert({ sender_id: me, recipient_id: peer, body: body.trim() });
      if (error) throw error;
      setBody("");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: Error) => toast.error("Erreur", { description: e.message }),
  });

  return (
    <Panel title="Conversation">
      <div
        ref={scrollRef}
        className="mb-3 h-[420px] overflow-y-auto rounded-xl border border-border bg-muted/20 p-4"
      >
        {messages.length === 0 ? (
          <p className="grid h-full place-items-center text-sm text-muted-foreground">
            Aucun message. Démarrez la conversation.
          </p>
        ) : (
          <ul className="space-y-2">
            {messages.map((m) => {
              const mine = m.sender_id === me;
              return (
                <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                      mine ? "bg-primary text-primary-foreground" : "bg-card border border-border"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.body}</div>
                    <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send.mutate();
        }}
        className="flex gap-2"
      >
        <Textarea
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Votre message..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send.mutate();
            }
          }}
        />
        <Button type="submit" disabled={send.isPending || !body.trim()}>
          {send.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </Panel>
  );
}
