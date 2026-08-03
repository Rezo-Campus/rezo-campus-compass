import { createFileRoute } from "@tanstack/react-router";
import { AgendaView } from "@/components/AgendaView";

export const Route = createFileRoute("/_authenticated/secretaire/agenda")({
  component: () => (
    <AgendaView
      department="all"
      canEdit
      title="Agenda général — tous les départements"
    />
  ),
});
