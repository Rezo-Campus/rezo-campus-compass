import { createFileRoute } from "@tanstack/react-router";
import { AgendaView } from "@/components/AgendaView";

export const Route = createFileRoute("/_authenticated/projets/taches")({
  component: () => (
    <AgendaView
      department="projets"
      canEdit
      title="Tâches — Management de Projet"
    />
  ),
});
