import { createFileRoute } from "@tanstack/react-router";
import { ProtocolEditor } from "@/components/ProtocolEditor";

export const Route = createFileRoute("/_authenticated/rh/protocoles")({
  component: () => <ProtocolEditor department="rh" />,
});
