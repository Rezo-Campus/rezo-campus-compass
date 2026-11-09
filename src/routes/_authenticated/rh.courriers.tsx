import { createFileRoute } from "@tanstack/react-router";
import { TransmissionsInternes } from "@/components/TransmissionsInternes";

export const Route = createFileRoute("/_authenticated/rh/courriers")({
  component: () => <TransmissionsInternes department="rh" eyebrow="Ressources Humaines" />,
});
