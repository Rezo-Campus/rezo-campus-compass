import { createFileRoute } from "@tanstack/react-router";
import { MesEtudiants } from "./conseiller.etudiants";

export const Route = createFileRoute("/_authenticated/admin/dossiers")({
  component: MesEtudiants,
});
