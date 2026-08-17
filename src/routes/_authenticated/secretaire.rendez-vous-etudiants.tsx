import { createFileRoute } from "@tanstack/react-router";
import { RdvConseiller } from "./conseiller.rendez-vous";

export const Route = createFileRoute("/_authenticated/secretaire/rendez-vous-etudiants")({
  component: RdvConseiller,
});
