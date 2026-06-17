import { createFileRoute } from "@tanstack/react-router";
import { MesEtudiants } from "./conseiller.etudiants.index";

export const Route = createFileRoute("/_authenticated/admin/dossiers")({
  component: MesEtudiants,
});
