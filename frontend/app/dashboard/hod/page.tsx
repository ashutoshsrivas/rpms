"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, readAuth } from "../../lib/authStorage";

type RequestStatus = "draft" | "submitted" | "in-review" | "approved" | "rejected" | string;

type RequestRow = {
  id: number;
  user_email: string;
  request_type?: string;
  approval_authority?: string | null;
  status: RequestStatus;
  created_at?: string;
  updated_at?: string;
};

export default function HodDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState(readAuth());
  const [mounted, setMounted] = useState(false);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

  const navItems = useMemo(
    () => [
      { label: "Overview", href: "/dashboard/hod" },
      { label: "Department requests", href: "/dashboard/hod/requests" },
      { label: "Profile", href: "/dashboard/hod/profile" },
    ],
    []
  );

  useEffect(() => {
    const stored = readAuth();
    if (stored.role !== "HOD") {
      router.replace("/signin");
      return;
    }
    setAuth(stored);
    setMounted(true);
    if (stored.email) {
      loadRequests(stored.email);
    }
  }, [router]);

  async function loadRequests(email: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/requests?limit=200`, {
        headers: { "x-user-email": email },
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load requests");
      }
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load requests", err);
      setError("Unable to load requests");
    } finally {
      setLoading(false);
    }
  }

  function handleSignOut() {
    clearAuth();
    router.replace("/signin");
  }

  function formatDate(input?: string) {
    if (!input) return "—";
    const dt = new Date(input);
    if (Number.isNaN(dt.getTime())) return "—";
    return dt.toLocaleString();
  }

  const statusCounts = useMemo(() => {
    return requests.reduce<Record<string, number>>((acc, req) => {
      const key = (req.status || "unknown").toString().toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [requests]);

  const pendingRows = useMemo(() => {
    return [...requests]
      .filter((r) => ["draft", "in-review", "submitted"].includes((r.status || "").toString().toLowerCase()))
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
      .slice(0, 5);
  }, [requests]);

  function toTitle(req: RequestRow) {
    const type = (req.request_type || "seed-research").toLowerCase();
    if (["conference", "workshop", "fdp"].includes(type)) return "Event";
    if (type === "laptop-grant") return "Laptop grant";
    if (type === "external-funding") return "External funding";
    return "Seed research";
  }

  function exportCsv(filename: string, rows: RequestRow[]) {
    const header = ["id", "owner", "type", "status", "updated_at"].join(",");
    const body = rows
      .map((r) => {
        const cells = [r.id, r.user_email, r.request_type || "seed-research", r.status, r.updated_at || r.created_at || ""];
        return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",");
      })
      .join("\n");
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handleExport(kind: "pending" | "submitted" | "approved" | "chat") {
    const lower = (s: RequestStatus) => (s || "").toString().toLowerCase();
    if (kind === "pending") {
      const rows = requests.filter((r) => ["draft", "in-review"].includes(lower(r.status)));
      exportCsv("pending-approvals.csv", rows);
      return;
    }
    if (kind === "submitted") {
      const rows = requests.filter((r) => lower(r.status) === "submitted");
      exportCsv("submitted-to-admin.csv", rows);
      return;
    }
    if (kind === "approved") {
      const rows = requests.filter((r) => lower(r.status) === "approved");
      exportCsv("approved-history.csv", rows);
      return;
    }
    if (kind === "chat") {
      // Chat export not wired to backend yet; reuse CSV with available request metadata.
      exportCsv("chat-log-summary.csv", requests);
    }
  }

  if (!mounted) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen lg:pl-72">
        <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-slate-200 bg-white/90 px-6 py-8 backdrop-blur lg:flex">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">RPMS</p>
              <p className="text-xl font-semibold text-slate-900">HOD</p>
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
                  <span
                    className={
                      "h-2 w-2 rounded-full " + (active ? "bg-slate-500" : "bg-slate-300")
                    }
                    aria-hidden="true"
                  />
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
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Dashboard</p>
              <h1 className="text-3xl font-semibold">HOD overview</h1>
              <p className="text-sm text-slate-600">Only HOD can view this page.</p>
              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
              {auth.token && (
                <>
                  <span className="rounded-md bg-white px-3 py-2 shadow-sm">{auth.email || "(no email)"}</span>
                  <span className="rounded-md bg-white px-3 py-2 shadow-sm">{auth.role || "USER"}</span>
                  <button
                    className="rounded-md bg-slate-900 px-3 py-2 text-white transition hover:bg-slate-800"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>
          </header>

          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Open requests</p>
              <p className="mt-3 text-3xl font-semibold">{requests.length}</p>
              <p className="text-xs text-emerald-600">Loaded live</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Awaiting HOD</p>
              <p className="mt-3 text-3xl font-semibold">{(statusCounts["draft"] || 0) + (statusCounts["in-review"] || 0)}</p>
              <p className="text-xs text-amber-600">Needs your review</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Sent to Admin</p>
              <p className="mt-3 text-3xl font-semibold">{statusCounts["submitted"] || 0}</p>
              <p className="text-xs text-slate-500">Waiting final decision</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Approved</p>
              <p className="mt-3 text-3xl font-semibold">{statusCounts["approved"] || 0}</p>
              <p className="text-xs text-emerald-600">Department total</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Pending items</p>
                    <p className="text-sm text-slate-600">Requests requiring your review</p>
                  </div>
                  <Link href="/dashboard/hod/requests" className="text-sm font-medium text-slate-700 underline">
                    View requests
                  </Link>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Request</th>
                        <th className="px-4 py-3 font-semibold">Owner</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {loading && (
                        <tr>
                          <td className="px-4 py-4 text-sm text-slate-600" colSpan={4}>
                            Loading requests...
                          </td>
                        </tr>
                      )}
                      {!loading && !pendingRows.length && (
                        <tr>
                          <td className="px-4 py-4 text-sm text-slate-600" colSpan={4}>
                            Nothing pending right now.
                          </td>
                        </tr>
                      )}
                      {!loading &&
                        pendingRows.map((req) => (
                          <tr key={req.id} className="bg-white hover:bg-slate-50">
                            <td className="px-4 py-3">{toTitle(req)}</td>
                            <td className="px-4 py-3">{req.user_email}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{req.status}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{formatDate(req.updated_at || req.created_at)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Reports & exports</p>
                  <p className="text-sm text-slate-600">Download departmental snapshots</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                  onClick={() => handleExport("pending")}
                  disabled={loading || !requests.length}
                >
                  Export pending approvals (CSV)
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                  onClick={() => handleExport("submitted")}
                  disabled={loading || !requests.length}
                >
                  Export submissions to Admin (CSV)
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                  onClick={() => handleExport("approved")}
                  disabled={loading || !requests.length}
                >
                  Export approved history (CSV)
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                  onClick={() => handleExport("chat")}
                  disabled={loading || !requests.length}
                >
                  Export chat log summary (CSV)
                </button>
              </div>
              <div className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Tip</p>
                <p>Use exports to attach evidence to meeting decks or share with Admin.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
