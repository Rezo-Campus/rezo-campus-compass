import { createFileRoute } from "@tanstack/react-router";
import { TransmissionsInternes } from "@/components/TransmissionsInternes";

export const Route = createFileRoute("/_authenticated/admin/courriers")({
  component: () => (
    <TransmissionsInternes department="admin" eyebrow="Administration générale" canSeeAll />
  ),
});
