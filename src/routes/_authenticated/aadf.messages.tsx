import { createFileRoute } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/dashboard-bits";

export const Route = createFileRoute("/_authenticated/aadf/messages")({
  component: AadfMessages,
});

function AadfMessages() {
  return (
    <>
      <PageHeader
        eyebrow="AADF"
        title="Messagerie interne"
        description="Échangez des messages avec les autres départements."
      />
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 text-center text-muted-foreground">
        <MessageSquare className="mb-4 size-12 text-muted-foreground/30" />
        <p className="text-sm">La messagerie inter-départements sera disponible prochainement.</p>
      </div>
    </>
  );
}
