"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, readAuth } from "../../lib/authStorage";

type RequestStatus = "draft" | "approved" | "rejected" | string;

type ResearchRequest = {
  id: number;
  status: RequestStatus;
  request_type?: string;
  upload_key?: string | null;
  upload_url?: string | null;
  approval_authority?: string | null;
  created_at?: string;
  updated_at?: string;
  data?: any;
};

export default function UserDashboardPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState(readAuth());
  const [mounted, setMounted] = useState(false);
  const [requests, setRequests] = useState<ResearchRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

  const navItems = useMemo(
    () => [
      { label: "Overview", href: "/dashboard/user" },
      { label: "My requests", href: "/dashboard/user/requests" },
      { label: "Profile", href: "/dashboard/user/profile" },
    ],
    []
  );

  useEffect(() => {
    const stored = readAuth();
    if (stored.role !== "USER") {
      router.replace("/signin");
      return;
    }
    setAuth(stored);
    setMounted(true);
  }, [router]);

  useEffect(() => {
    if (mounted && auth?.email) {
      loadRequests();
    }
  }, [mounted, auth?.email]);

  function handleSignOut() {
    clearAuth();
    router.replace("/signin");
  }

  async function loadRequests() {
    if (!auth?.email) return;
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const res = await fetch(
        `${apiBase}/api/seed-research/drafts?email=${encodeURIComponent(auth.email)}&type=all`,
        { headers: { "x-user-email": auth.email } }
      );
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to fetch requests");
      }
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch requests", err);
      setRequestsError("Failed to load your requests.");
    } finally {
      setRequestsLoading(false);
    }
  }

  function formatDate(input?: string | null) {
    if (!input) return "—";
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function requestTitle(req: ResearchRequest) {
    try {
      const parsed = (() => {
        if (!req.data) return {} as any;
        if (typeof req.data === "string") return JSON.parse(req.data);
        return req.data;
      })();
      if ((req.request_type || "") === "conference" || req.request_type === "workshop" || req.request_type === "fdp") {
        return parsed.eventTitle || "Untitled event";
      }
      if ((req.request_type || "") === "laptop-grant") {
        return parsed.applicantName || "Laptop grant";
      }
      return parsed.proposalTitle || parsed.eventTitle || "Untitled";
    } catch (err) {
      return "Untitled";
    }
  }

  const statusCounts = useMemo(() => {
    return requests.reduce<Record<string, number>>((acc, req) => {
      const key = (req.status || "unknown").toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [requests]);

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    requests.forEach((req) => {
      const key = (req.request_type || "seed-research").toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [requests]);

  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => {
        const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
        const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [requests]);

  const lastUpdated = useMemo(() => {
    if (!requests.length) return "—";
    const latest = recentRequests[0];
    return formatDate(latest?.updated_at || latest?.created_at || null);
  }, [recentRequests, requests.length]);

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
              <p className="text-xl font-semibold text-slate-900">User</p>
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
              <h1 className="text-3xl font-semibold">User overview</h1>
              <p className="text-sm text-slate-600">Track your submissions, drafts, and approvals in one place.</p>
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

          <div className="mb-4 flex items-center justify-between text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Live</span>
              <span>{requestsLoading ? "Syncing your requests…" : "Latest snapshot of your submissions."}</span>
            </div>
            <button
              className="text-sm font-semibold text-slate-700 underline"
              onClick={loadRequests}
              disabled={requestsLoading}
            >
              {requestsLoading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {requestsError && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {requestsError}
            </div>
          )}

          <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total requests</p>
              <p className="mt-3 text-3xl font-semibold">{requests.length}</p>
              <p className="text-xs text-slate-600">Last updated: {lastUpdated}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Drafts in progress</p>
              <p className="mt-3 text-3xl font-semibold">{statusCounts.draft || 0}</p>
              <p className="text-xs text-amber-600">Keep them moving</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Approved</p>
              <p className="mt-3 text-3xl font-semibold">{statusCounts.approved || 0}</p>
              <p className="text-xs text-emerald-600">Great job</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Request types</p>
              <p className="mt-3 text-3xl font-semibold">{typeCounts.length}</p>
              <p className="text-xs text-slate-600">Most common: {typeCounts[0]?.[0] || "n/a"}</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">My recent activity</p>
                    <p className="text-sm text-slate-600">Latest updates on your requests</p>
                  </div>
                  <Link className="text-sm font-medium text-slate-700 underline" href="/dashboard/user/requests">
                    View all
                  </Link>
                </div>
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Request</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Updated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {!requestsLoading && !recentRequests.length && (
                        <tr>
                          <td className="px-4 py-3 text-sm text-slate-600" colSpan={3}>
                            No activity yet. Create your first request to see it here.
                          </td>
                        </tr>
                      )}
                      {requestsLoading && (
                        <tr>
                          <td className="px-4 py-3 text-sm text-slate-600" colSpan={3}>
                            Loading your activity…
                          </td>
                        </tr>
                      )}
                      {!requestsLoading &&
                        recentRequests.map((req) => (
                          <tr key={req.id} className="bg-white hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-900">{requestTitle(req)}</span>
                                <span className="text-xs text-slate-500">Type: {req.request_type || "seed-research"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-800">
                                {req.status || "unknown"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{formatDate(req.updated_at || req.created_at)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Requests by type</p>
                    <p className="text-sm text-slate-600">Where your submissions are focused</p>
                  </div>
                  <Link className="text-sm font-medium text-slate-700 underline" href="/dashboard/user/requests">
                    Manage requests
                  </Link>
                </div>
                {!requests.length && !requestsLoading && (
                  <p className="text-sm text-slate-600">No data yet. Start a request to see breakdowns.</p>
                )}
                {requestsLoading && <p className="text-sm text-slate-600">Loading breakdown…</p>}
                {!requestsLoading && !!typeCounts.length && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {typeCounts.map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                        <div>
                          <p className="text-sm font-semibold capitalize text-slate-900">{type.replace("-", " ")}</p>
                          <p className="text-xs text-slate-500">{count} request{count !== 1 ? "s" : ""}</p>
                        </div>
                        <Link className="text-xs font-semibold text-slate-700 underline" href="/dashboard/user/requests">
                          View
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Quick actions</p>
                  <p className="text-sm text-slate-600">Your shortcuts</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 text-sm">
                <Link
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                  href="/dashboard/user/requests"
                >
                  Create or edit requests
                </Link>
                <Link
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50"
                  href="/dashboard/user/profile"
                >
                  Update profile & password
                </Link>
              </div>
              <div className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Reminder</p>
                <p>Keep drafts updated to avoid delays. Upload supporting documents before submitting.</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700">
                <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-slate-500">Snapshots</p>
                <p className="font-semibold text-slate-900">Drafts: {statusCounts.draft || 0}</p>
                <p className="font-semibold text-slate-900">Approved: {statusCounts.approved || 0}</p>
                <p className="font-semibold text-slate-900">Rejected: {statusCounts.rejected || 0}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
