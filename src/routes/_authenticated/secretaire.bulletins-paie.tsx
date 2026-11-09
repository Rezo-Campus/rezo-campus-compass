import { createFileRoute } from "@tanstack/react-router";
import { BulletinsPaie } from "./comptabilite.bulletins-paie";

export const Route = createFileRoute("/_authenticated/secretaire/bulletins-paie")({
  component: BulletinsPaie,
});
