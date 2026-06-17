import { createFileRoute } from "@tanstack/react-router";
import { ConseillerStudentDetail } from "./conseiller.etudiants.$studentId";

export const Route = createFileRoute("/_authenticated/secretaire/etudiants/$studentId")({
  component: ConseillerStudentDetail,
});
