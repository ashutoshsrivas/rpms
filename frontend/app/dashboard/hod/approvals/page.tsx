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

function statusClasses(status: RequestStatus) {
  const normalized = (status || "").toString().toLowerCase();
  if (normalized === "approved") return "bg-emerald-50 text-emerald-700";
  if (normalized === "rejected") return "bg-rose-50 text-rose-700";
  if (normalized === "in-review") return "bg-amber-50 text-amber-700";
  if (normalized === "submitted") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-800";
}

function formatDate(input?: string) {
  if (!input) return "—";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString();
}

export default function HodApprovalsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState(readAuth());
  const [mounted, setMounted] = useState(false);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

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
  }, [mounted, auth?.email]);

  async function loadRequests() {
    if (!auth?.email) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/requests?status=submitted,in-review,draft`, {
        headers: { "x-user-email": auth.email },
        cache: "no-store",
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to fetch queue");
      }
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load approval queue", err);
      setError("Unable to load approval queue.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: number, status: RequestStatus) {
    if (!auth?.email) return;
    setUpdatingId(id);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/requests/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": auth.email,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to update status");
      }
      await loadRequests();
    } catch (err) {
      console.error("Failed to update status", err);
      setError("Unable to update status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  function handleSignOut() {
    clearAuth();
    router.replace("/signin");
  }

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
              <h1 className="text-3xl font-semibold">Approvals</h1>
              <p className="text-sm text-slate-600">Approve or reject requests before they reach Admin.</p>
            </div>
            <button
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              onClick={loadRequests}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </header>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Pending approvals</p>
                <p className="text-xs text-slate-500">Drafts and in-review items. Submit to Admin when ready.</p>
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
                    <th className="px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading && (
                    <tr>
                      <td className="px-4 py-4 text-sm text-slate-600" colSpan={5}>
                        Loading queue...
                      </td>
                    </tr>
                  )}
                  {!loading && !requests.length && (
                    <tr>
                      <td className="px-4 py-4 text-sm text-slate-600" colSpan={5}>
                        Nothing pending right now.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    requests.map((req) => {
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
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-amber-300"
                                onClick={() => updateStatus(req.id, "in-review")}
                                disabled={
                                  updatingId === req.id ||
                                  !["draft"].includes((req.status || "").toString().toLowerCase())
                                }
                              >
                                Mark in review
                              </button>
                              <button
                                className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
                                onClick={() => updateStatus(req.id, "submitted")}
                                disabled={
                                  updatingId === req.id ||
                                  !["draft", "in-review"].includes((req.status || "").toString().toLowerCase())
                                }
                              >
                                Submit to Admin
                              </button>
                              <Link
                                href={`/dashboard/hod/requests/${req.id}`}
                                className="text-xs font-semibold text-slate-800 underline"
                              >
                                Open chat
                              </Link>
                            </div>
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
