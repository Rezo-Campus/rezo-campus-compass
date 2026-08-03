import { createFileRoute } from "@tanstack/react-router";
import { FacturesPage } from "@/components/FacturesPage";

export const Route = createFileRoute("/_authenticated/comptabilite/factures")({
  component: FacturesPage,
});
