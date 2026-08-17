import { createFileRoute } from "@tanstack/react-router";
import { MonProfilPage } from "@/components/MonProfilPage";

export const Route = createFileRoute("/_authenticated/commercial/profil")({
  component: MonProfilPage,
});
