import { createFileRoute } from "@tanstack/react-router";
import { AgendaView } from "@/components/AgendaView";

export const Route = createFileRoute("/_authenticated/commercial/agenda-marketing")({
  component: () => (
    <AgendaView
      department="marketing"
      canEdit
      title="Agenda Marketing"
    />
  ),
});
