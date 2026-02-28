import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";

type AuthStatus = {
  authEnabled: boolean;
  setupRequired: boolean;
  authenticated: boolean;
};

type State = { status: "loading" } | { status: "ready" } | { status: "redirect"; to: string };

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/status")
      .then((res) => res.json() as Promise<AuthStatus>)
      .then((data) => {
        if (cancelled) return;
        if (!data.authEnabled) {
          setState({ status: "ready" });
          return;
        }
        if (data.setupRequired) {
          setState({ status: "redirect", to: "/auth/setup" });
          return;
        }
        if (!data.authenticated) {
          const next = encodeURIComponent(location.pathname + location.search);
          setState({ status: "redirect", to: `/login?next=${next}` });
          return;
        }
        setState({ status: "ready" });
      })
      .catch(() => {
        // Network error — assume authenticated to avoid redirect loops during restarts
        if (!cancelled) setState({ status: "ready" });
      });
    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search]);

  if (state.status === "loading") return null;
  if (state.status === "redirect") {
    void navigate(state.to, { replace: true });
    return null;
  }
  return <>{children}</>;
}
