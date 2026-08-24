"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, readAuth } from "../../../lib/authStorage";

type RequestStatus = "draft" | "submitted" | "in-review" | "approved" | "rejected" | string;

type RequestRow = {
  id: number;
  user_email: string;
  owner_name?: string | null;
  owner_phone?: string | null;
  request_type?: string;
  approval_authority?: string | null;
  status: RequestStatus;
  data?: string | Record<string, unknown> | null;
  upload_key?: string | null;
  upload_url?: string | null;
  created_at?: string;
  updated_at?: string;
  messages_count?: number;
  files_count?: number;
  requirements_count?: number;
  submissions_count?: number;
};

const STATUS_LIST: { value: RequestStatus; label: string; tone: string }[] = [
  { value: "draft", label: "Draft", tone: "bg-slate-100 text-slate-700 ring-slate-200" },
  { value: "submitted", label: "Submitted", tone: "bg-blue-50 text-blue-700 ring-blue-200" },
  { value: "in-review", label: "In review", tone: "bg-amber-50 text-amber-700 ring-amber-200" },
  { value: "approved", label: "Approved", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { value: "rejected", label: "Rejected", tone: "bg-rose-50 text-rose-700 ring-rose-200" },
];

const TYPE_LIST: { value: string; label: string }[] = [
  { value: "seed-research", label: "Seed Research" },
  { value: "conference", label: "Conference" },
  { value: "workshop", label: "Workshop" },
  { value: "fdp", label: "FDP" },
  { value: "laptop-grant", label: "Laptop Grant" },
  { value: "external-funding", label: "External Funding" },
];

function statusTone(status: RequestStatus) {
  const found = STATUS_LIST.find((s) => s.value === (status || "").toString().toLowerCase());
  return found?.tone || "bg-slate-100 text-slate-700 ring-slate-200";
}

function typeLabel(type?: string) {
  return TYPE_LIST.find((t) => t.value === type)?.label || type || "seed-research";
}

function formatDate(input?: string) {
  if (!input) return "—";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relTime(input?: string) {
  if (!input) return "";
  const dt = new Date(input);
  if (Number.isNaN(dt.getTime())) return "";
  const diff = Date.now() - dt.getTime();
  const min = 60 * 1000;
  const hr = 60 * min;
  const day = 24 * hr;
  if (diff < min) return "just now";
  if (diff < hr) return `${Math.floor(diff / min)}m ago`;
  if (diff < day) return `${Math.floor(diff / hr)}h ago`;
  if (diff < 30 * day) return `${Math.floor(diff / day)}d ago`;
  return dt.toLocaleDateString();
}

function parseData(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function requestTitle(req: RequestRow): string {
  const data = parseData(req.data);
  const candidates = [
    "title",
    "projectTitle",
    "eventName",
    "conferenceTitle",
    "workshopTitle",
    "fdpTitle",
    "paperTitle",
    "purpose",
    "topic",
  ];
  for (const key of candidates) {
    const v = data[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return typeLabel(req.request_type);
}

export default function AdminRequestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState(readAuth());
  const [mounted, setMounted] = useState(false);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<"updated_at" | "created_at" | "id" | "status">("updated_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pendingDelete, setPendingDelete] = useState<RequestRow | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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

  useEffect(() => {
    if (mounted && auth?.email) loadRequests();

  }, [mounted, auth?.email]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  async function loadRequests() {
    if (!auth?.email) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", "500");
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
      setError("Unable to load admin requests.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteRequest(req: RequestRow) {
    if (!auth?.email) return;
    setDeletingId(req.id);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/requests/${req.id}`, {
        method: "DELETE",
        headers: { "x-user-email": auth.email },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to delete");
      }
      setRequests((rows) => rows.filter((r) => r.id !== req.id));
      setPendingDelete(null);
      setToast(`Request #${req.id} deleted.`);
    } catch (err) {
      console.error("Failed to delete request", err);
      setError(err instanceof Error ? err.message : "Failed to delete request");
    } finally {
      setDeletingId(null);
    }
  }

  function handleSignOut() {
    clearAuth();
    router.replace("/signin");
  }

  function toggleSet(set: Set<string>, value: string, setter: (v: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  const statusCounts = useMemo(() => {
    return requests.reduce<Record<string, number>>((acc, req) => {
      const key = (req.status || "unknown").toString().toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [requests]);

  const typeCounts = useMemo(() => {
    return requests.reduce<Record<string, number>>((acc, req) => {
      const key = req.request_type || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const toTs = (value?: string) => {
      if (!value) return null;
      const dt = new Date(value);
      return Number.isNaN(dt.getTime()) ? null : dt.getTime();
    };
    const fromTs = toTs(dateFrom);
    const toTsVal = toTs(dateTo ? `${dateTo}T23:59:59` : undefined);
    const q = search.trim().toLowerCase();

    const filtered = requests.filter((r) => {
      const s = (r.status || "").toLowerCase();
      const t = r.request_type || "";
      const matchStatus = statusFilter.size === 0 || statusFilter.has(s);
      const matchType = typeFilter.size === 0 || typeFilter.has(t);
      const updated = r.updated_at || r.created_at;
      const updatedTs = toTs(updated);
      const matchFrom = fromTs === null || (updatedTs !== null && updatedTs >= fromTs);
      const matchTo = toTsVal === null || (updatedTs !== null && updatedTs <= toTsVal);
      const matchSearch =
        !q ||
        String(r.id).includes(q) ||
        (r.user_email || "").toLowerCase().includes(q) ||
        (r.owner_name || "").toLowerCase().includes(q) ||
        requestTitle(r).toLowerCase().includes(q) ||
        (r.approval_authority || "").toLowerCase().includes(q);
      return matchStatus && matchType && matchFrom && matchTo && matchSearch;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      if (sortKey === "id") return (a.id - b.id) * dir;
      if (sortKey === "status") return (a.status || "").localeCompare(b.status || "") * dir;
      const av = new Date(a[sortKey] || 0).getTime();
      const bv = new Date(b[sortKey] || 0).getTime();
      return (av - bv) * dir;
    });
    return filtered;
  }, [requests, statusFilter, typeFilter, dateFrom, dateTo, search, sortKey, sortDir]);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function sortIndicator(key: typeof sortKey) {
    if (sortKey !== key) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  }

  function clearFilters() {
    setStatusFilter(new Set());
    setTypeFilter(new Set());
    setDateFrom("");
    setDateTo("");
    setSearch("");
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

        <section className="flex-1 px-5 py-8 sm:px-8 lg:px-10">
          <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Admin</p>
              <h1 className="text-3xl font-semibold">Requests</h1>
              <p className="text-sm text-slate-600">
                All grant submissions across every request type. Filter, sort, open for review, or delete.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                onClick={loadRequests}
                disabled={loading}
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </header>

          {/* Stat tiles */}
          <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <StatTile label="Total" value={requests.length} accent="bg-slate-900" />
            {STATUS_LIST.map((s) => (
              <StatTile
                key={s.value}
                label={s.label}
                value={statusCounts[s.value] || 0}
                dotClass={s.tone.split(" ")[0].replace("bg-", "bg-").replace("-50", "-500")}
              />
            ))}
          </div>

          {/* Filter bar */}
          <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search id, email, title, owner, authority…"
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 pl-9 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
                />
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">⌕</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <label className="flex items-center gap-1">
                  <span>From</span>
                  <input
                    type="date"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </label>
                <label className="flex items-center gap-1">
                  <span>To</span>
                  <input
                    type="date"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </label>
              </div>
              <button
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 mr-1">Status</span>
              {STATUS_LIST.map((s) => {
                const active = statusFilter.has(s.value);
                const count = statusCounts[s.value] || 0;
                return (
                  <button
                    key={s.value}
                    onClick={() => toggleSet(statusFilter, s.value, setStatusFilter)}
                    className={
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition " +
                      (active
                        ? `${s.tone} ring-current`
                        : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")
                    }
                  >
                    {s.label}
                    <span className="rounded bg-white/70 px-1 text-[10px] font-semibold text-slate-700">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 mr-1">Type</span>
              {TYPE_LIST.map((t) => {
                const active = typeFilter.has(t.value);
                const count = typeCounts[t.value] || 0;
                return (
                  <button
                    key={t.value}
                    onClick={() => toggleSet(typeFilter, t.value, setTypeFilter)}
                    className={
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition " +
                      (active
                        ? "bg-slate-900 text-white ring-slate-900"
                        : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50")
                    }
                  >
                    {t.label}
                    <span
                      className={
                        "rounded px-1 text-[10px] font-semibold " +
                        (active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-700")
                      }
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Requests</p>
                <p className="text-xs text-slate-500">
                  Showing {filteredRequests.length} of {requests.length}
                </p>
              </div>
              {error && (
                <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700">
                  {error}
                </p>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <Th className="w-16 cursor-pointer" onClick={() => toggleSort("id")}>
                      # {sortIndicator("id")}
                    </Th>
                    <Th>Request</Th>
                    <Th>Owner</Th>
                    <Th className="cursor-pointer" onClick={() => toggleSort("status")}>
                      Status {sortIndicator("status")}
                    </Th>
                    <Th className="w-28">Activity</Th>
                    <Th className="cursor-pointer" onClick={() => toggleSort("created_at")}>
                      Created {sortIndicator("created_at")}
                    </Th>
                    <Th className="cursor-pointer" onClick={() => toggleSort("updated_at")}>
                      Updated {sortIndicator("updated_at")}
                    </Th>
                    <Th className="w-40 text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading && (
                    <tr>
                      <td className="px-4 py-6 text-sm text-slate-500" colSpan={8}>
                        Loading requests…
                      </td>
                    </tr>
                  )}
                  {!loading && !filteredRequests.length && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={8}>
                        No requests match the current filters.
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    filteredRequests.map((req) => {
                      const title = requestTitle(req);
                      const owner = req.owner_name?.trim() || req.user_email;
                      const files = req.files_count || 0;
                      const messages = req.messages_count || 0;
                      const reqs = req.requirements_count || 0;
                      const subs = req.submissions_count || 0;
                      const primaryFile = req.upload_key ? 1 : 0;
                      const totalFiles = files + primaryFile;
                      return (
                        <tr key={req.id} className="bg-white hover:bg-slate-50">
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">#{req.id}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col">
                              <Link
                                href={`/dashboard/admin/requests/${req.id}`}
                                className="line-clamp-2 max-w-[24rem] font-semibold text-slate-900 hover:underline"
                                title={title}
                              >
                                {title}
                              </Link>
                              <span className="mt-0.5 inline-flex w-fit items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                                {typeLabel(req.request_type)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col text-sm">
                              <span className="font-medium text-slate-800">{owner}</span>
                              {req.owner_name && (
                                <span className="text-xs text-slate-500">{req.user_email}</span>
                              )}
                              {req.approval_authority && (
                                <span className="mt-0.5 text-[11px] text-slate-500">
                                  Authority: {req.approval_authority}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${statusTone(
                                req.status
                              )}`}
                            >
                              {req.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-1 text-[11px] text-slate-600">
                              <ActivityChip label="📎" value={totalFiles} tip="Files (primary + chat)" />
                              <ActivityChip label="💬" value={messages} tip="Chat messages" />
                              {reqs > 0 && (
                                <ActivityChip
                                  label="📋"
                                  value={`${subs}/${reqs}`}
                                  tip="Post-approval submissions / requirements"
                                />
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div className="flex flex-col">
                              <span>{formatDate(req.created_at)}</span>
                              <span className="text-[11px] text-slate-400">{relTime(req.created_at)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            <div className="flex flex-col">
                              <span>{formatDate(req.updated_at)}</span>
                              <span className="text-[11px] text-slate-400">{relTime(req.updated_at)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <Link
                                href={`/dashboard/admin/requests/${req.id}`}
                                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Open
                              </Link>
                              <button
                                onClick={() => setPendingDelete(req)}
                                className="rounded-md border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                                disabled={deletingId === req.id}
                              >
                                {deletingId === req.id ? "Deleting…" : "Delete"}
                              </button>
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

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <DeleteModal
          request={pendingDelete}
          isDeleting={deletingId === pendingDelete.id}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => deleteRequest(pendingDelete)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border border-slate-200 bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}

function StatTile({
  label,
  value,
  accent,
  dotClass,
}: {
  label: string;
  value: number;
  accent?: string;
  dotClass?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        {accent ? (
          <span className={`h-2 w-2 rounded-full ${accent}`} />
        ) : (
          <span className={`h-2 w-2 rounded-full ${dotClass || "bg-slate-300"}`} />
        )}
        <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      </div>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Th({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <th
      onClick={onClick}
      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide select-none ${className}`}
    >
      {children}
    </th>
  );
}

function ActivityChip({
  label,
  value,
  tip,
}: {
  label: string;
  value: number | string;
  tip: string;
}) {
  return (
    <span
      title={tip}
      className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700"
    >
      <span aria-hidden>{label}</span>
      <span>{value}</span>
    </span>
  );
}

function DeleteModal({
  request,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  request: RequestRow;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const requiredText = `DELETE ${request.id}`;
  const armed = confirmText.trim() === requiredText;
  const files = (request.files_count || 0) + (request.upload_key ? 1 : 0);
  const messages = request.messages_count || 0;
  const reqs = request.requirements_count || 0;
  const subs = request.submissions_count || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-rose-600">Delete request</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">This cannot be undone.</h2>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm text-slate-700">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-slate-900">
              #{request.id} — {requestTitle(request)}
            </p>
            <p className="text-xs text-slate-600">
              {typeLabel(request.request_type)} · {request.status} · Owner: {request.user_email}
            </p>
          </div>
          <p>
            Deleting this request will also remove{" "}
            <b>
              {messages} chat message{messages === 1 ? "" : "s"}
            </b>
            ,{" "}
            <b>
              {files} file record{files === 1 ? "" : "s"}
            </b>
            {reqs > 0 && (
              <>
                , and{" "}
                <b>
                  {reqs} post-approval requirement{reqs === 1 ? "" : "s"} ({subs} submission
                  {subs === 1 ? "" : "s"})
                </b>
              </>
            )}
            . The underlying S3 files remain in storage and can still be managed under Files.
          </p>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">
              Type <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">{requiredText}</code>{" "}
              to confirm
            </span>
            <input
              type="text"
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-mono focus:border-rose-400 focus:outline-none"
              placeholder={requiredText}
            />
          </label>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
          <button
            onClick={onCancel}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!armed || isDeleting}
            className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
          >
            {isDeleting ? "Deleting…" : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}
