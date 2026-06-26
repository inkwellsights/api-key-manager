import { CheckCircle2, XCircle, Info, Database, Key, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

const MONTHLY_QUOTA = 30_000;

interface EnvRowProps {
  label: string;
  present: boolean;
  description?: string;
}

function EnvRow({ label, present, description }: EnvRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/60 last:border-0">
      <div className="min-w-0">
        <p className="text-xs font-medium text-text font-mono">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-text-muted">{description}</p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        {present ? (
          <>
            <CheckCircle2
              size={14}
              aria-hidden="true"
              style={{ color: "var(--green)" }}
            />
            <span className="text-xs font-medium" style={{ color: "var(--green)" }}>
              Configured
            </span>
          </>
        ) : (
          <>
            <XCircle
              size={14}
              aria-hidden="true"
              style={{ color: "var(--red)" }}
            />
            <span className="text-xs font-medium" style={{ color: "var(--red)" }}>
              Missing
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  // SUPABASE_URL is public -- safe to display
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;

  // Presence checks only -- secret values are never rendered
  const secretKeyPresent = Boolean(process.env.SUPABASE_SECRET_KEY);
  const publishableKeyPresent = Boolean(process.env.SUPABASE_PUBLISHABLE_KEY);
  const encSecretPresent = Boolean(process.env.API_KEY_ENC_SECRET);
  const databaseUrlPresent = Boolean(process.env.DATABASE_URL);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Auth notice */}
      <section
        className="rounded-xl border p-5 flex gap-4"
        style={{
          background: "rgba(124,92,255,0.07)",
          borderColor: "rgba(124,92,255,0.3)",
        }}
      >
        <Info
          size={18}
          className="shrink-0 mt-0.5"
          style={{ color: "var(--accent)" }}
          aria-hidden="true"
        />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-text">
            This dashboard is intentionally unauthenticated
          </p>
          <p className="text-xs text-text-muted leading-relaxed">
            For demonstration purposes, no login is required to access this
            dashboard. Before exposing it publicly, add an authentication layer
            (for example, NextAuth.js, Clerk, or a middleware-based session
            check) to protect all routes under{" "}
            <span className="font-mono text-text">src/app</span>.
          </p>
        </div>
      </section>

      {/* Supabase URL */}
      <section className="rounded-xl border border-border bg-panel shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Globe size={16} className="text-text-muted" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-text">Supabase</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <p className="text-xs font-medium text-text-muted mb-1">
              NEXT_PUBLIC_SUPABASE_URL
            </p>
            {supabaseUrl ? (
              <p className="font-mono text-xs text-text break-all">{supabaseUrl}</p>
            ) : (
              <p className="text-xs text-text-muted italic">Not set</p>
            )}
          </div>
        </div>
      </section>

      {/* Environment variables */}
      <section className="rounded-xl border border-border bg-panel shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Key size={16} className="text-text-muted" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-text">
            Environment Variables
          </h2>
        </div>
        <div className="px-5 py-2">
          <EnvRow
            label="SUPABASE_SECRET_KEY"
            present={secretKeyPresent}
            description="Service role key for server-side Supabase operations"
          />
          <EnvRow
            label="SUPABASE_PUBLISHABLE_KEY"
            present={publishableKeyPresent}
            description="Anon key for client-side Supabase access"
          />
          <EnvRow
            label="API_KEY_ENC_SECRET"
            present={encSecretPresent}
            description="AES-256-GCM secret used to encrypt stored API keys"
          />
          <EnvRow
            label="DATABASE_URL"
            present={databaseUrlPresent}
            description="Direct Postgres connection string (used by migrations)"
          />
        </div>
      </section>

      {/* Quota */}
      <section className="rounded-xl border border-border bg-panel shadow-sm">
        <div className="flex items-center gap-2 border-b border-border px-5 py-4">
          <Database size={16} className="text-text-muted" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-text">Usage Quota</h2>
        </div>
        <div className="px-5 py-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">Monthly request limit</p>
            <p className="text-xs font-semibold text-text tabular-nums">
              {MONTHLY_QUOTA.toLocaleString()} requests
            </p>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            This is a display constant shown in the sidebar. To enforce it,
            add a quota check in the API route before processing requests.
          </p>
        </div>
      </section>
    </div>
  );
}
