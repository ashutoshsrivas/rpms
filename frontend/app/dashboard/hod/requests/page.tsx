"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, readAuth } from "../../../lib/authStorage";

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

export default function HodRequestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState(readAuth());
  const [mounted, setMounted] = useState(false);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>("all");
  const [filterTitle, setFilterTitle] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterStatusText, setFilterStatusText] = useState("");
  const [filterUpdated, setFilterUpdated] = useState("");

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
  }, [router]);

  useEffect(() => {
    if (mounted && auth?.email) {
      loadRequests();
    }
  }, [mounted, auth?.email, statusFilter]);

  async function loadRequests() {
    if (!auth?.email) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "200");
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`${apiBase}/api/requests?${params.toString()}`, {
        headers: { "x-user-email": auth.email },
        cache: "no-store",
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to fetch requests");
      }
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load requests", err);
      setError("Unable to load department requests.");
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

  const filteredRequests = useMemo(() => {
    const lower = (val: unknown) => (val || "").toString().toLowerCase();
    return requests
      .filter((r) => (statusFilter === "all" ? true : lower(r.status) === statusFilter))
      .filter((r) => {
        const title = (() => {
          if (r.request_type === "conference" || r.request_type === "workshop" || r.request_type === "fdp") return "event";
          if (r.request_type === "laptop-grant") return "laptop grant";
          if (r.request_type === "external-funding") return "external funding";
          return "seed research";
        })();
        const matchesTitle = !filterTitle.trim() || title.includes(lower(filterTitle));
        const matchesOwner = !filterOwner.trim() || lower(r.user_email).includes(lower(filterOwner));
        const matchesStatusText = !filterStatusText.trim() || lower(r.status).includes(lower(filterStatusText));
        const dateText = lower(r.updated_at || r.created_at || "");
        const matchesDate = !filterUpdated.trim() || dateText.includes(lower(filterUpdated));
        return matchesTitle && matchesOwner && matchesStatusText && matchesDate;
      });
  }, [requests, statusFilter, filterTitle, filterOwner, filterStatusText, filterUpdated]);

  if (!mounted) return null;

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
                    className={"h-2 w-2 rounded-full " + (active ? "bg-slate-500" : "bg-slate-300")}
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
          <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">HOD</p>
              <h1 className="text-3xl font-semibold">Department requests</h1>
              <p className="text-sm text-slate-600">Review and approve any request from your department.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RequestStatus | "all")}
              >
                <option value="all">All statuses</option>
                <option value="submitted">Submitted</option>
                <option value="in-review">In review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="draft">Draft</option>
              </select>
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                onClick={loadRequests}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </header>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total requests</p>
              <p className="mt-3 text-3xl font-semibold">{requests.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Submitted</p>
              <p className="mt-3 text-3xl font-semibold">{statusCounts["submitted"] || 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">In review</p>
              <p className="mt-3 text-3xl font-semibold">{statusCounts["in-review"] || 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">Approved</p>
              <p className="mt-3 text-3xl font-semibold">{statusCounts["approved"] || 0}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Requests</p>
                <p className="text-xs text-slate-500">Filtered: {filteredRequests.length}</p>
              </div>
              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Request</th>
                    <th className="px-4 py-3 font-semibold">Owner</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                  <tr className="bg-white text-xs text-slate-600">
                    <th className="px-4 py-2">
                      <input
                        type="text"
                        value={filterTitle}
                        onChange={(e) => setFilterTitle(e.target.value)}
                        placeholder="Search title"
                        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input
                        type="text"
                        value={filterOwner}
                        onChange={(e) => setFilterOwner(e.target.value)}
                        placeholder="Search owner"
                        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input
                        type="text"
                        value={filterStatusText}
                        onChange={(e) => setFilterStatusText(e.target.value)}
                        placeholder="Search status"
                        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
                      />
                    </th>
                    <th className="px-4 py-2">
                      <input
                        type="text"
                        value={filterUpdated}
                        onChange={(e) => setFilterUpdated(e.target.value)}
                        placeholder="Search date"
                        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
                      />
                    </th>
                    <th className="px-4 py-2" />
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
                  {!loading && !filteredRequests.length && (
                    <tr>
                      <td className="px-4 py-4 text-sm text-slate-600" colSpan={5}>
                        No requests match the current filter.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filteredRequests.map((req) => {
                      const title = (() => {
                        if (req.request_type === "conference" || req.request_type === "workshop" || req.request_type === "fdp") {
                          return "Event";
                        }
                        if (req.request_type === "laptop-grant") return "Laptop grant";
                        if (req.request_type === "external-funding") return "External funding";
                        return "Seed research";
                      })();

                      return (
                        <tr key={req.id} className="bg-white hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900">{title}</span>
                              <span className="text-xs text-slate-500">Type: {req.request_type || "seed-research"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col text-sm text-slate-700">
                              <span>{req.user_email}</span>
                              {req.approval_authority && (
                                <span className="text-xs text-slate-500">Authority: {req.approval_authority}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(req.status)}`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(req.updated_at)}</td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/dashboard/hod/requests/${req.id}`}
                              className="text-sm font-semibold text-slate-800 underline"
                            >
                              Open
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
