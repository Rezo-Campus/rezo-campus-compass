import { createFileRoute } from "@tanstack/react-router";
import { RdvConseiller } from "./conseiller.rendez-vous";

export const Route = createFileRoute("/_authenticated/admin/rendez-vous")({
  component: RdvConseiller,
});
