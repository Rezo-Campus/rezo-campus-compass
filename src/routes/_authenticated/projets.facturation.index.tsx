import { createFileRoute } from "@tanstack/react-router";
import { FacturationListe } from "./comptabilite.facturation.index";

export const Route = createFileRoute("/_authenticated/projets/facturation/")({
  component: FacturationListe,
});
