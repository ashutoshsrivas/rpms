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

function formatDate(input?: string) {
  if (!input) return "—";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

function statusClasses(status: RequestStatus) {
  const normalized = (status || "").toString().toLowerCase();
  if (normalized === "approved") return "bg-emerald-50 text-emerald-700";
  if (normalized === "rejected") return "bg-rose-50 text-rose-700";
  if (normalized === "in-review") return "bg-amber-50 text-amber-700";
  if (normalized === "submitted") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-800";
}

export default function AdminDashboardPage() {
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
      { label: "Overview", href: "/dashboard/admin" },
      { label: "Requests", href: "/dashboard/admin/requests" },
      { label: "Users", href: "/dashboard/admin/users" },
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
      console.error("Failed to load admin requests", err);
      setError("Unable to load requests");
    } finally {
      setLoading(false);
    }
  }

  function handleSignOut() {
    clearAuth();
    router.replace("/signin");
  }

  const statusCounts = useMemo(() => {
    return requests.reduce<Record<string, number>>((acc, req) => {
      const key = (req.status || "unknown").toString().toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [requests]);

  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime())
      .slice(0, 6);
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

  function handleExport(kind: "submitted" | "in-review" | "approved" | "rejected" | "all") {
    const lower = (s: RequestStatus) => (s || "").toString().toLowerCase();
    if (kind === "all") {
      exportCsv("all-requests.csv", requests);
      return;
    }
    const rows = requests.filter((r) => lower(r.status) === kind);
    const filename = `${kind}-requests.csv`;
    exportCsv(filename, rows);
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
              <h1 className="text-3xl font-semibold">Admin overview</h1>
              <p className="text-sm text-slate-600">Only ADMIN can view this page.</p>
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
              <p className="text-xs uppercase tracking-wide text-slate-500">Total requests</p>
              <p className="mt-3 text-3xl font-semibold">{requests.length}</p>
              <p className="text-xs text-slate-500">Live across all departments</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Submitted</p>
              <p className="mt-3 text-3xl font-semibold">{statusCounts["submitted"] || 0}</p>
              <p className="text-xs text-amber-600">Awaiting Admin triage</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">In review</p>
              <p className="mt-3 text-3xl font-semibold">{statusCounts["in-review"] || 0}</p>
              <p className="text-xs text-slate-500">Active reviews</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Approved</p>
              <p className="mt-3 text-3xl font-semibold">{statusCounts["approved"] || 0}</p>
              <p className="text-xs text-emerald-600">Finalized</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Recent requests</p>
                    <p className="text-sm text-slate-600">Latest submissions across departments</p>
                  </div>
                  <Link href="/dashboard/admin/requests" className="text-sm font-medium text-slate-700 underline">
                    View all
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
                        <th className="px-4 py-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {loading && (
                        <tr>
                          <td className="px-4 py-4 text-sm text-slate-600" colSpan={5}>
                            Loading requests...
                          </td>
                        </tr>
                      )}
                      {!loading && !recentRequests.length && (
                        <tr>
                          <td className="px-4 py-4 text-sm text-slate-600" colSpan={5}>
                            No requests found.
                          </td>
                        </tr>
                      )}
                      {!loading &&
                        recentRequests.map((req) => (
                          <tr key={req.id} className="bg-white hover:bg-slate-50">
                            <td className="px-4 py-3">{toTitle(req)}</td>
                            <td className="px-4 py-3">{req.user_email}</td>
                            <td className="px-4 py-3">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(req.status)}`}>
                                {req.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{formatDate(req.updated_at || req.created_at)}</td>
                            <td className="px-4 py-3">
                              <Link href={`/dashboard/admin/requests/${req.id}`} className="text-sm font-semibold text-slate-800 underline">
                                Open
                              </Link>
                            </td>
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
                  <p className="text-sm text-slate-600">Download governance snapshots</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                  onClick={() => handleExport("all")}
                  disabled={loading || !requests.length}
                >
                  Export all requests (CSV)
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                  onClick={() => handleExport("submitted")}
                  disabled={loading || !requests.length}
                >
                  Export submitted (CSV)
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                  onClick={() => handleExport("in-review")}
                  disabled={loading || !requests.length}
                >
                  Export in-review (CSV)
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                  onClick={() => handleExport("approved")}
                  disabled={loading || !requests.length}
                >
                  Export approved (CSV)
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                  onClick={() => handleExport("rejected")}
                  disabled={loading || !requests.length}
                >
                  Export rejected (CSV)
                </button>
              </div>
              <div className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Tip</p>
                <p>Use exports for audit evidence or quarterly governance decks.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
