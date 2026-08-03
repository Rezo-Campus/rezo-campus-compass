import { createFileRoute } from "@tanstack/react-router";
import { AgendaView } from "@/components/AgendaView";

export const Route = createFileRoute("/_authenticated/rh/agenda")({
  component: () => (
    <AgendaView
      department="rh"
      canEdit
      title="Agenda RH"
    />
  ),
});
