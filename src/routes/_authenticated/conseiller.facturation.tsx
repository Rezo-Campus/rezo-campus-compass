import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/conseiller/facturation")({
  component: () => <Outlet />,
});
