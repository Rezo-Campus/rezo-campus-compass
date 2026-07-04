import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Bell, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function NotificationsBell() {
  const { data: auth } = useAuth();
  const uid = auth?.user?.id;
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const { data: notifs = [] } = useQuery({
    enabled: !!uid,
    queryKey: ["notifications", uid],
    staleTime: 15_000,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", uid!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", uid] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await supabase.from("notifications").update({ read: true }).eq("user_id", uid!).eq("read", false);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", uid] }),
  });

  const unread = notifs.filter((n) => !n.read).length;

  return (
    <div ref={ref} className="relative print:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid min-w-[16px] place-items-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold leading-[16px] text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 max-h-[420px] overflow-y-auto rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={() => markAllRead.mutate()}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <Check className="size-3" /> Tout lire
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>
          </div>

          {notifs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Aucune notification
            </div>
          ) : (
            <ul>
              {notifs.map((n) => (
                <li
                  key={n.id}
                  onClick={() => { if (!n.read) markRead.mutate(n.id); }}
                  className={`cursor-pointer border-b border-border px-4 py-3 transition last:border-0 hover:bg-muted/50 ${
                    n.read ? "opacity-60" : "bg-primary/5"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                    <div className={n.read ? "" : "ml-0"}>
                      <p className="text-sm font-medium leading-snug">{n.title}</p>
                      {n.body && (
                        <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                          {n.body}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
