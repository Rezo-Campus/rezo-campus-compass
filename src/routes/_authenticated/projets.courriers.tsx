import { createFileRoute } from "@tanstack/react-router";
import { TransmissionsInternes } from "@/components/TransmissionsInternes";

export const Route = createFileRoute("/_authenticated/projets/courriers")({
  component: () => <TransmissionsInternes department="chef_projet" eyebrow="Projets IT" />,
});
