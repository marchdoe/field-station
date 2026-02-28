import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";

type AuthStatus = {
  authEnabled: boolean;
  setupRequired: boolean;
  authenticated: boolean;
};

type State = { status: "loading" } | { status: "ready" } | { status: "redirect"; to: string };

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function checkAuth() {
      try {
        const statusRes = await fetch("/api/auth/status");
        const data = (await statusRes.json()) as AuthStatus;
        if (cancelled) return;

        if (!data.authEnabled) {
          setState({ status: "ready" });
          return;
        }
        if (data.setupRequired) {
          setState({ status: "redirect", to: "/auth/setup" });
          return;
        }
        // Ping a protected endpoint to detect actual cookie auth state,
        // since /api/auth/status cannot inspect the session cookie server-side.
        const pingRes = await fetch("/api/health");
        if (cancelled) return;
        if (pingRes.status === 401) {
          const next = encodeURIComponent(location.pathname + location.search);
          setState({ status: "redirect", to: `/login?next=${next}` });
          return;
        }
        setState({ status: "ready" });
      } catch {
        // Network error — assume authenticated to avoid redirect loops during restarts
        if (!cancelled) setState({ status: "ready" });
      }
    }

    void checkAuth();
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);

  if (state.status === "loading") return null;
  if (state.status === "redirect") {
    return <Navigate to={state.to} replace />;
  }
  return <>{children}</>;
}
