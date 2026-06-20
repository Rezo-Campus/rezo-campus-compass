import { createFileRoute } from "@tanstack/react-router";
import { MeetingsCalendar } from "./rh.reunions";

export const Route = createFileRoute("/_authenticated/projets/reunions")({
  component: MeetingsCalendar,
});
