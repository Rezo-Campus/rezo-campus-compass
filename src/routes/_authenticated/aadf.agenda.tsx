import { createFileRoute } from "@tanstack/react-router";
import { AgendaView } from "@/components/AgendaView";

export const Route = createFileRoute("/_authenticated/aadf/agenda")({
  component: () => (
    <AgendaView
      department="aadf"
      canEdit
      title="Agenda AADF"
    />
  ),
});
