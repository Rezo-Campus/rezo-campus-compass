import { createFileRoute } from "@tanstack/react-router";
import { FactureDetail } from "./comptabilite.facturation.$invoiceId";

export const Route = createFileRoute("/_authenticated/admin/facturation/$invoiceId")({
  component: FactureDetail,
});
