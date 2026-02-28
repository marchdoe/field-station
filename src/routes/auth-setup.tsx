import { Radio } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

export function AuthSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        void navigate(next);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Setup failed. Please try again.");
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
          <h1 className="text-2xl font-bold text-text-primary mb-1">Set up Field Station</h1>
          <p className="text-text-secondary text-sm">
            Create a password to protect access to your Claude configuration.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface-1 border border-border-default rounded-xl p-6 space-y-4"
        >
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent text-sm"
            />
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-text-primary mb-2"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border-default text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent text-sm"
            />
          </div>

          {error && (
            <p
              className="text-sm text-danger"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !password || !confirm}
            className="w-full py-2.5 px-4 rounded-xl font-medium text-sm transition-colors bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Setting up\u2026" : "Set password"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-text-muted">
          To disable auth, set{" "}
          <code className="bg-surface-1 px-1 py-0.5 rounded font-mono">
            FIELD_STATION_AUTH=false
          </code>
        </p>
      </div>
    </div>
  );
}
