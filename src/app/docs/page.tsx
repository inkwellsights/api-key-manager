import { BookOpen, Terminal, CheckCircle2, XCircle, Info } from "lucide-react";

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-bg border border-border p-4 font-mono text-xs leading-relaxed overflow-x-auto">
      {children}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-panel shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
        <span className="text-text-muted">{icon}</span>
        <h2 className="text-sm font-semibold text-text">{title}</h2>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </section>
  );
}

export default function DocsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Overview */}
      <SectionCard
        icon={<BookOpen size={16} aria-hidden="true" />}
        title="API Overview"
      >
        <p className="text-xs text-text-muted leading-relaxed">
          All API requests are authenticated with a bearer token included in the{" "}
          <span className="font-mono text-text">Authorization</span> header.
          Keys are scoped per application and can be managed from the{" "}
          <a
            href="/keys"
            className="underline hover:no-underline"
            style={{ color: "var(--accent)" }}
          >
            API Keys
          </a>{" "}
          page. Disabled or revoked keys return{" "}
          <span className="font-mono text-text">401 Unauthorized</span> and usage
          metadata (last used timestamp, request count) updates automatically on
          every successful request.
        </p>
      </SectionCard>

      {/* Authentication */}
      <SectionCard
        icon={<Terminal size={16} aria-hidden="true" />}
        title="Authentication"
      >
        <p className="text-xs text-text-muted leading-relaxed">
          Include your API key as a bearer token in the{" "}
          <span className="font-mono text-text">Authorization</span> header on
          every request. The key must be active -- disabled and revoked keys will
          return a 401 response.
        </p>

        <div>
          <p className="mb-2 text-xs font-medium text-text-muted">
            Authorization Header
          </p>
          <CodeBlock>
            <p className="text-text-muted">
              Authorization:{" "}
              <span style={{ color: "var(--accent)" }}>
                Bearer sk_live_&lt;your-key&gt;
              </span>
            </p>
          </CodeBlock>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-text-muted">
            curl Example
          </p>
          <CodeBlock>
            <p className="text-text-muted">
              <span style={{ color: "var(--accent)" }}>curl</span>{" "}
              <span style={{ color: "var(--amber)" }}>-H</span>{" "}
              <span style={{ color: "var(--green)" }}>
                &quot;Authorization: Bearer sk_live_...&quot;
              </span>{" "}
              \
            </p>
            <p className="text-text-muted pl-4">
              https://&lt;your-app&gt;/api/data
            </p>
          </CodeBlock>
        </div>
      </SectionCard>

      {/* Endpoint reference */}
      <SectionCard
        icon={<CheckCircle2 size={16} aria-hidden="true" />}
        title="Endpoint Reference"
      >
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg/40">
            <span
              className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold font-mono"
              style={{
                background: "rgba(34,197,94,0.15)",
                color: "var(--green)",
              }}
            >
              GET
            </span>
            <span className="font-mono text-xs text-text">/api/data</span>
          </div>
          <div className="px-4 py-3 space-y-1">
            <p className="text-xs text-text-muted">
              Returns a JSON payload containing a data message. Requires a valid
              active API key.
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-text-muted">
              <span>
                <span className="text-text font-medium">Auth:</span> Bearer token
              </span>
              <span>
                <span className="text-text font-medium">Rate limit:</span> 100
                requests / minute per key
              </span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Success response */}
      <SectionCard
        icon={<CheckCircle2 size={16} aria-hidden="true" />}
        title="Success Response"
      >
        <p className="text-xs text-text-muted">
          HTTP <span className="font-mono text-text">200 OK</span> when the key
          is valid and active.
        </p>
        <CodeBlock>
          <p className="text-text">{"{"}</p>
          <p className="pl-4">
            <span style={{ color: "var(--green)" }}>&quot;success&quot;</span>
            {": "}
            <span style={{ color: "var(--amber)" }}>true</span>
            {","}
          </p>
          <p className="pl-4">
            <span style={{ color: "var(--green)" }}>&quot;data&quot;</span>
            {": {"}
          </p>
          <p className="pl-8">
            <span style={{ color: "var(--green)" }}>&quot;message&quot;</span>
            {": "}
            <span style={{ color: "var(--amber)" }}>
              &quot;Here is your data&quot;
            </span>
          </p>
          <p className="pl-4">{"}"}</p>
          <p className="text-text">{"}"}</p>
        </CodeBlock>
      </SectionCard>

      {/* Error response */}
      <SectionCard
        icon={<XCircle size={16} aria-hidden="true" />}
        title="Error Response"
      >
        <p className="text-xs text-text-muted">
          HTTP{" "}
          <span className="font-mono text-text">401 Unauthorized</span> when the
          key is missing, invalid, disabled, or revoked.
        </p>
        <CodeBlock>
          <p className="text-text">{"{"}</p>
          <p className="pl-4">
            <span style={{ color: "var(--green)" }}>&quot;success&quot;</span>
            {": "}
            <span style={{ color: "var(--red)" }}>false</span>
            {","}
          </p>
          <p className="pl-4">
            <span style={{ color: "var(--green)" }}>&quot;error&quot;</span>
            {": "}
            <span style={{ color: "var(--amber)" }}>&quot;Unauthorized&quot;</span>
          </p>
          <p className="text-text">{"}"}</p>
        </CodeBlock>

        <div
          className="rounded-lg border p-4 flex gap-3"
          style={{
            background: "rgba(239,68,68,0.07)",
            borderColor: "rgba(239,68,68,0.25)",
          }}
        >
          <XCircle
            size={14}
            className="shrink-0 mt-0.5"
            style={{ color: "var(--red)" }}
            aria-hidden="true"
          />
          <p className="text-xs text-text-muted leading-relaxed">
            Disabled and revoked keys both return 401. A disabled key can be
            re-enabled from the{" "}
            <a
              href="/keys"
              className="underline hover:no-underline"
              style={{ color: "var(--accent)" }}
            >
              API Keys
            </a>{" "}
            page, while a revoked key cannot be recovered.
          </p>
        </div>
      </SectionCard>

      {/* Usage metadata */}
      <SectionCard
        icon={<Info size={16} aria-hidden="true" />}
        title="Usage Metadata"
      >
        <p className="text-xs text-text-muted leading-relaxed">
          Every authenticated request automatically updates the key&apos;s{" "}
          <span className="font-mono text-text">last_used_at</span> timestamp and
          increments its <span className="font-mono text-text">request_count</span>.
          Request logs are stored in{" "}
          <span className="font-mono text-text">usage_logs</span> with the
          endpoint, method, HTTP status code, and response time. You can view
          full log history on the{" "}
          <a
            href="/logs"
            className="underline hover:no-underline"
            style={{ color: "var(--accent)" }}
          >
            Usage Logs
          </a>{" "}
          page.
        </p>
      </SectionCard>
    </div>
  );
}
