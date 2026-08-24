"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, readAuth } from "../../../lib/authStorage";

const REQUEST_TYPES = [
  { key: "seed-research", label: "Seed Research" },
  { key: "conference", label: "Conference" },
  { key: "workshop", label: "Workshop" },
  { key: "fdp", label: "FDP" },
  { key: "laptop-grant", label: "Laptop Grant" },
  { key: "external-funding", label: "External Funding" },
] as const;

export default function AdminReportsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState(readAuth());
  const [mounted, setMounted] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

  const navItems = useMemo(
    () => [
      { label: "Overview", href: "/dashboard/admin" },
      { label: "Requests", href: "/dashboard/admin/requests" },
      { label: "Users", href: "/dashboard/admin/users" },
      { label: "Files", href: "/dashboard/admin/files" },
      { label: "Reports", href: "/dashboard/admin/reports" },
    ],
    []
  );

  useEffect(() => {
    const stored = readAuth();
    if (stored.role !== "ADMIN") {
      router.replace("/signin");
      return;
    }
    setAuth(stored);
    setMounted(true);
  }, [router]);

  function handleSignOut() {
    clearAuth();
    router.replace("/signin");
  }

  async function download(kind: string, path: string, filename: string) {
    if (!auth?.token) return;
    setDownloading(kind);
    setError(null);
    try {
      const res = await fetch(`${apiBase}${path}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to download report");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download report", err);
      setError(err instanceof Error ? err.message : "Unable to download report");
    } finally {
      setDownloading(null);
    }
  }

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen lg:pl-72">
        <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-slate-200 bg-white/90 px-6 py-8 backdrop-blur lg:flex">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">RPMS</p>
              <p className="text-xl font-semibold text-slate-900">Admin</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-2 text-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Navigation</p>
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition hover:bg-slate-100 " +
                    (active ? "bg-slate-100 text-slate-900" : "text-slate-700")
                  }
                  aria-current={active ? "page" : undefined}
                >
                  <span className={"h-2 w-2 rounded-full " + (active ? "bg-slate-500" : "bg-slate-300")} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <div className="mt-auto pt-6">
              {auth.token && (
                <div className="flex flex-col gap-2 rounded-lg bg-slate-100 px-3 py-3 text-xs text-slate-700">
                  <span className="font-semibold">{auth.email || "(no email)"}</span>
                  <span className="uppercase tracking-wide text-slate-500">{auth.role || "USER"}</span>
                  <button
                    className="self-start rounded-md border border-slate-300 px-2 py-1 text-[12px] font-medium text-slate-700 transition hover:bg-white"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </nav>
        </aside>

        <section className="flex-1 px-5 py-10 sm:px-8 lg:px-12">
          <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Admin</p>
              <h1 className="text-3xl font-semibold">Reports</h1>
              <p className="text-sm text-slate-600">
                Full data exports. CSVs include every submission field flattened as{" "}
                <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">data.*</code> columns; the full workbook
                bundles requests, users, uploads, chat, and post-approval activity across multiple sheets.
              </p>
            </div>
          </header>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <ReportCard
              title="Full Workbook"
              description="Every table in one .xlsx: summary, all requests, per-type sheets, users, uploads, chat, and post-approval."
              actions={
                <button
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={downloading === "full-xlsx"}
                  onClick={() =>
                    download("full-xlsx", "/api/reports/full.xlsx", "rpms-full-report.xlsx")
                  }
                >
                  {downloading === "full-xlsx" ? "Preparing..." : "Download full .xlsx"}
                </button>
              }
            />

            <ReportCard
              title="All Requests"
              description="Every request across all types, with owner details and all form fields flattened."
              actions={
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={downloading === "requests-csv"}
                    onClick={() =>
                      download("requests-csv", "/api/reports/requests.csv", "requests.csv")
                    }
                  >
                    {downloading === "requests-csv" ? "Downloading..." : "CSV"}
                  </button>
                  <button
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-200"
                    disabled={downloading === "requests-xlsx"}
                    onClick={() =>
                      download("requests-xlsx", "/api/reports/requests.xlsx", "rpms-full-report.xlsx")
                    }
                  >
                    {downloading === "requests-xlsx" ? "Preparing..." : "Excel"}
                  </button>
                </div>
              }
            />

            <ReportCard
              title="Users"
              description="All users with role, contact and per-user request activity counts."
              actions={
                <div className="flex flex-wrap gap-2">
                  <button
                    className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                    disabled={downloading === "users-csv"}
                    onClick={() =>
                      download("users-csv", "/api/reports/users.csv", "users.csv")
                    }
                  >
                    {downloading === "users-csv" ? "Downloading..." : "CSV"}
                  </button>
                  <button
                    className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-200"
                    disabled={downloading === "users-xlsx"}
                    onClick={() =>
                      download("users-xlsx", "/api/reports/users.xlsx", "users.xlsx")
                    }
                  >
                    {downloading === "users-xlsx" ? "Preparing..." : "Excel"}
                  </button>
                </div>
              }
            />

            <ReportCard
              title="Uploads"
              description="Every S3-backed upload with usage counts across requests, chat, and post-approval."
              actions={
                <button
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={downloading === "files-csv"}
                  onClick={() =>
                    download("files-csv", "/api/reports/files.csv", "files.csv")
                  }
                >
                  {downloading === "files-csv" ? "Downloading..." : "Download CSV"}
                </button>
              }
            />

            <ReportCard
              title="Chat Messages"
              description="Every chat message on every request, with sender and request context."
              actions={
                <button
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={downloading === "chat-csv"}
                  onClick={() =>
                    download("chat-csv", "/api/reports/chat-messages.csv", "chat-messages.csv")
                  }
                >
                  {downloading === "chat-csv" ? "Downloading..." : "Download CSV"}
                </button>
              }
            />

            <ReportCard
              title="Post-Approval"
              description="All post-approval requirements joined with their submissions."
              actions={
                <button
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  disabled={downloading === "post-csv"}
                  onClick={() =>
                    download("post-csv", "/api/reports/post-approval.csv", "post-approval.csv")
                  }
                >
                  {downloading === "post-csv" ? "Downloading..." : "Download CSV"}
                </button>
              }
            />
          </div>

          <section className="mt-10">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Requests by Type (CSV)</h2>
            <p className="mb-3 text-sm text-slate-600">
              Per-type CSV with all owner and form fields for that request type only.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {REQUEST_TYPES.map((t) => (
                <div
                  key={t.key}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{t.label}</p>
                    <p className="text-xs text-slate-500">requests-{t.key}.csv</p>
                  </div>
                  <button
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:bg-slate-200"
                    disabled={downloading === `type-${t.key}`}
                    onClick={() =>
                      download(
                        `type-${t.key}`,
                        `/api/reports/requests.csv?type=${encodeURIComponent(t.key)}`,
                        `requests-${t.key}.csv`
                      )
                    }
                  >
                    {downloading === `type-${t.key}` ? "..." : "Download"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function ReportCard({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="mb-3 text-sm text-slate-600">{description}</p>
      {actions}
    </div>
  );
}
