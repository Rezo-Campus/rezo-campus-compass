import { createFileRoute } from "@tanstack/react-router";
import { AgendaView } from "@/components/AgendaView";

export const Route = createFileRoute("/_authenticated/admin/agenda")({
  component: () => (
    <AgendaView
      department="all"
      canEdit
      title="Agenda général — administration"
    />
  ),
});
