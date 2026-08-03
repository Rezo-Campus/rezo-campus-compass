import { createFileRoute } from "@tanstack/react-router";
import { AgendaView } from "@/components/AgendaView";

export const Route = createFileRoute("/_authenticated/comptabilite/agenda")({
  component: () => (
    <AgendaView
      department="comptabilite"
      canEdit
      title="Agenda Finance & Comptabilité"
    />
  ),
});
