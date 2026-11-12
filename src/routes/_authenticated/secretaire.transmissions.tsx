import { createFileRoute } from "@tanstack/react-router";
import { TransmissionsInternes } from "@/components/TransmissionsInternes";

export const Route = createFileRoute("/_authenticated/secretaire/transmissions")({
  component: () => (
    <TransmissionsInternes department="secretaire" eyebrow="Secrétariat" canSeeAll />
  ),
});
