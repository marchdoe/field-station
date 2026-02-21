import { Radio } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") ?? undefined;
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (next) params.set("next", next);

      const res = await fetch(`/api/auth/login?${params}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        redirect: "follow",
      });

      if (res.redirected) {
        // Validate the redirect is same-origin to prevent open redirect attacks.
        const redirectUrl = new URL(res.url);
        if (redirectUrl.origin === window.location.origin) {
          window.location.href = res.url;
        } else {
          window.location.href = "/";
        }
        return;
      }

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Invalid token");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-muted mb-4">
            <Radio className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Field Station</h1>
          <p className="text-text-secondary text-sm">Enter your access token to continue</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-1 border border-border-default rounded-xl p-6 space-y-4"
        >
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-text-secondary mb-1.5">
              Access token
            </label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="••••••••••••"
              required
              autoFocus
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent text-sm"
            />
          </div>

          <p
            className="text-sm text-danger min-h-[1.25rem]"
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
          >
            {error ?? ""}
          </p>

          <button
            type="submit"
            disabled={submitting || !token}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-colors bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Signing in\u2026" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
