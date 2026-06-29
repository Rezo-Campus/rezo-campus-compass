import { createFileRoute } from "@tanstack/react-router";
import { FacturationListe } from "./comptabilite.facturation.index";

export const Route = createFileRoute("/_authenticated/rh/facturation/")({
  component: FacturationListe,
});
