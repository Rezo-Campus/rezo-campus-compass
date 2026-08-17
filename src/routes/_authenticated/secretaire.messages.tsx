import { createFileRoute } from "@tanstack/react-router";
import { MessagesConseiller } from "./conseiller.messages";

export const Route = createFileRoute("/_authenticated/secretaire/messages")({
  validateSearch: (s: Record<string, unknown>) => ({
    studentId: typeof s.studentId === "string" ? s.studentId : undefined,
  }),
  component: MessagesConseiller,
});
