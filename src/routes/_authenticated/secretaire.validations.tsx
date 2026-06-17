import { createFileRoute } from "@tanstack/react-router";
import { Validations } from "./conseiller.validations";

export const Route = createFileRoute("/_authenticated/secretaire/validations")({
  component: Validations,
});
