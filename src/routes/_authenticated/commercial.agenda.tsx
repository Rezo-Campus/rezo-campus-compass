import { createFileRoute } from "@tanstack/react-router";
import { AgendaView } from "@/components/AgendaView";

export const Route = createFileRoute("/_authenticated/commercial/agenda")({
  component: () => (
    <AgendaView
      department="commercial"
      canEdit
      title="Agenda Commercial"
    />
  ),
});
