import { createFileRoute } from "@tanstack/react-router";
import { AgendaView } from "@/components/AgendaView";

export const Route = createFileRoute("/_authenticated/aadf/taches")({
  component: () => (
    <AgendaView
      department="all"
      canEdit
      title="Tâches inter-départements"
    />
  ),
});
