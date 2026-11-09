import { createFileRoute } from "@tanstack/react-router";
import { TransmissionsInternes } from "@/components/TransmissionsInternes";

export const Route = createFileRoute("/_authenticated/commercial/courriers")({
  component: () => (
    <TransmissionsInternes department="commercial" eyebrow="Marketing & Communication" />
  ),
});
