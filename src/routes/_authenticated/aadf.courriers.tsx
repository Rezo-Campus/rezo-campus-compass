import { createFileRoute } from "@tanstack/react-router";
import { TransmissionsInternes } from "@/components/TransmissionsInternes";

export const Route = createFileRoute("/_authenticated/aadf/courriers")({
  component: () => <TransmissionsInternes department="aadf" eyebrow="AADF" />,
});
