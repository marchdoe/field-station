import { Radio } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") ?? undefined;
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ password }),
        redirect: "follow",
      });

      if (res.redirected) {
        const redirectUrl = new URL(res.url);
        if (redirectUrl.origin === window.location.origin) {
          window.location.href = res.url;
        } else {
          window.location.href = "/";
        }
        return;
      }

      if (res.ok) {
        window.location.href = next ?? "/";
        return;
      }

      setError("Incorrect password. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-6">
      <div className="w-full max-w-sm -mt-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent-muted mb-4">
            <Radio className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Field Station</h1>
          <p className="text-text-secondary text-sm">Claude Code configuration manager</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-1 border border-border-default rounded-xl p-6"
        >
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoFocus
              autoComplete="current-password"
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent text-sm"
            />
          </div>

          {error && (
            <p
              className="text-sm text-danger mb-4"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !password}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-colors bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Signing in\u2026" : "Sign in"}
          </button>

          <div className="mt-4 pt-4 border-t border-border-muted">
            <details className="group">
              <summary className="cursor-pointer text-xs text-text-muted hover:text-text-secondary transition-colors list-none flex items-center gap-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 transition-transform group-open:rotate-90"
                  aria-hidden="true"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                Forgot your password?
              </summary>
              <div className="mt-3 space-y-2 text-xs text-text-secondary">
                <p>To reset your password, stop the server and delete the credentials file:</p>
                <pre className="bg-surface-2 rounded px-2 py-1.5 font-mono text-text-primary overflow-x-auto">
                  rm ~/.claude/field-station-credentials
                </pre>
                <p className="text-text-muted">
                  Restart the server — you'll be taken back to the setup page to create a new
                  password.
                </p>
              </div>
            </details>
          </div>
        </form>
      </div>
    </div>
  );
}
