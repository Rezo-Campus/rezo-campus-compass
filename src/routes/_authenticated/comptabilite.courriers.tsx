import { createFileRoute } from "@tanstack/react-router";
import { TransmissionsInternes } from "@/components/TransmissionsInternes";

export const Route = createFileRoute("/_authenticated/comptabilite/courriers")({
  component: () => <TransmissionsInternes department="comptabilite" eyebrow="Comptabilité" />,
});
