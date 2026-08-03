import { createFileRoute } from "@tanstack/react-router";
import { FacturesPage, FacturationListe } from "@/components/FacturesPage";

export const Route = createFileRoute("/_authenticated/comptabilite/facturation/")({
  component: FacturesPage,
});

export { FacturationListe };
