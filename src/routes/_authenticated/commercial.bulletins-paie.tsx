import { createFileRoute } from "@tanstack/react-router";
import { BulletinsPaie } from "./comptabilite.bulletins-paie";

export const Route = createFileRoute("/_authenticated/commercial/bulletins-paie")({
  component: BulletinsPaie,
});
