import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;
    if (!data?.user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (data.profile?.blocked_at) {
      navigate({ to: "/blocked", replace: true });
    }
  }, [data, isLoading, navigate]);

  if (isLoading) {
    return (
      <div
        style={{
          display: "grid",
          placeItems: "center",
          minHeight: "100vh",
          background: "var(--background, #f9fafb)",
        }}
      >
        <style>{`
          @keyframes rc-breathe {
            0%, 100% { transform: scale(1);   opacity: 1; }
            50%       { transform: scale(1.06); opacity: 0.85; }
          }
          @keyframes rc-fadein {
            from { opacity: 0; transform: scale(0.88); }
            to   { opacity: 1; transform: scale(1); }
          }
          @keyframes rc-bar {
            0%   { width: 0%; opacity: 1; }
            80%  { width: 100%; opacity: 1; }
            100% { width: 100%; opacity: 0; }
          }
          .rc-logo-anim {
            animation: rc-fadein 0.4s ease-out forwards,
                       rc-breathe 2s ease-in-out 0.4s infinite;
          }
          .rc-bar-anim {
            animation: rc-bar 1.8s ease-in-out infinite;
          }
        `}</style>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <img
            src="/1.png"
            alt="Rézo Campus"
            className="rc-logo-anim"
            style={{ width: 120, height: 120, objectFit: "contain" }}
          />
          {/* Barre de chargement fine */}
          <div style={{
            width: 120, height: 3, borderRadius: 999,
            background: "var(--border, #e4e7e7)",
            overflow: "hidden",
          }}>
            <div
              className="rc-bar-anim"
              style={{
                height: "100%",
                background: "var(--primary, #0e6b6f)",
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!data?.user || data.profile?.blocked_at) {
    return null;
  }

  return <Outlet />;
}
