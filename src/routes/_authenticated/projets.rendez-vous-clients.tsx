import { createFileRoute } from "@tanstack/react-router";
import { ClientAppointments } from "./secretaire.rendez-vous";

export const Route = createFileRoute("/_authenticated/projets/rendez-vous-clients")({
  component: ClientAppointments,
});
