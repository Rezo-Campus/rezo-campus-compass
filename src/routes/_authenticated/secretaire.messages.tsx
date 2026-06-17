import { createFileRoute } from "@tanstack/react-router";
import { MessagesConseiller } from "./conseiller.messages";

export const Route = createFileRoute("/_authenticated/secretaire/messages")({
  component: MessagesConseiller,
});
