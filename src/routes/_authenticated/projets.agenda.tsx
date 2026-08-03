import { createFileRoute } from "@tanstack/react-router";
import { AgendaView } from "@/components/AgendaView";

export const Route = createFileRoute("/_authenticated/projets/agenda")({
  component: () => (
    <AgendaView
      department="projets"
      canEdit
      title="Agenda Management de Projet"
    />
  ),
});
