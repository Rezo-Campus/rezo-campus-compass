import { createFileRoute } from "@tanstack/react-router";
import { Transactions } from "./comptabilite.transactions";

export const Route = createFileRoute("/_authenticated/secretaire/transactions")({
  component: Transactions,
});
