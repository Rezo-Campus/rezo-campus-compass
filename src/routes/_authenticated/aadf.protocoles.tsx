import { createFileRoute } from "@tanstack/react-router";
import { ProtocolEditor } from "@/components/ProtocolEditor";

export const Route = createFileRoute("/_authenticated/aadf/protocoles")({
  component: () => <ProtocolEditor department="aadf" />,
});
