"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { UploadedRecord } from "../../../components/UploadPicker";
import { clearAuth, readAuth } from "../../../lib/authStorage";
import ResearchProjectFormModal, { Approver } from "./ResearchProjectFormModal";
import { initialFormState, ResearchFormState } from "./formState";
import ConferenceFormModal from "./ConferenceFormModal";
import { ConferenceFormState, initialConferenceFormState } from "./conferenceFormState";
import LaptopFormModal from "./LaptopFormModal";
import { LaptopFormState, initialLaptopFormState } from "./laptopFormState";
import ExternalFundingFormModal from "./ExternalFundingFormModal";
import { ExternalFormState, initialExternalFormState } from "./externalFormState";

type RequestStatus = "draft" | "approved";

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

export default function UserRequestsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState(readAuth());
  const [mounted, setMounted] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [activeForm, setActiveForm] = useState<"research-project" | "event" | "laptop" | "external" | null>(null);
  const [activeRequestType, setActiveRequestType] = useState<"seed-research" | "conference" | "workshop" | "fdp" | "laptop-grant" | "external-funding">("seed-research");
  const [selectedUpload, setSelectedUpload] = useState<UploadedRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [requests, setRequests] = useState<ResearchRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [approversLoading, setApproversLoading] = useState(false);
  const [approversError, setApproversError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "approved">("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "oldest">("recent");

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

  const seedOptions = [
    "Research project",
    "Conference",
    "FDP",
    "Workshop",
    "Laptop grant",
  ];

  const externalOptions = ["Agency/industry funding"];
  const [form, setForm] = useState<ResearchFormState>(initialFormState());
  const [eventForm, setEventForm] = useState<ConferenceFormState>(initialConferenceFormState());
  const [laptopForm, setLaptopForm] = useState<LaptopFormState>(initialLaptopFormState());
  const [externalForm, setExternalForm] = useState<ExternalFormState>(initialExternalFormState());

  const navItems = useMemo(
    () => [
      { label: "Overview", href: "/dashboard/user" },
      { label: "My requests", href: "/dashboard/user/requests" },
      { label: "Profile", href: "/dashboard/user/profile" },
    ],
    []
  );

  const filteredRequests = useMemo(() => {
    let filtered = [...requests];

    // Filter by status
    if (filterStatus !== "all") {
      filtered = filtered.filter((req) => req.status === filterStatus);
    }

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((req) => req.request_type === filterType);
    }

    // Search by title
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((req) => {
        try {
          const parsed = (() => {
            if (!req.data) return {} as any;
            if (typeof req.data === "string") return JSON.parse(req.data);
            return req.data;
          })();
          const title =
            parsed.proposalTitle ||
            parsed.eventTitle ||
            parsed.applicantName ||
            parsed.projectTitle ||
            "Untitled";
          return title.toLowerCase().includes(term);
        } catch {
          return false;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at || "").getTime();
      const dateB = new Date(b.updated_at || b.created_at || "").getTime();
      return sortBy === "recent" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [requests, searchTerm, filterStatus, filterType, sortBy]);

  const uniqueRequestTypes = useMemo(() => {
    const types = new Set(requests.map((r) => r.request_type).filter(Boolean));
    return Array.from(types).sort();
  }, [requests]);

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
      loadApprovers();
    }
  }, [mounted, auth?.email]);

  function handleSignOut() {
    clearAuth();
    router.replace("/signin");
  }

  function updateField<K extends keyof ResearchFormState>(key: K, value: ResearchFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateEventField<K extends keyof ConferenceFormState>(key: K, value: ConferenceFormState[K]) {
    setEventForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateLaptopField<K extends keyof LaptopFormState>(key: K, value: LaptopFormState[K]) {
    setLaptopForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateExternalField<K extends keyof ExternalFormState>(key: K, value: ExternalFormState[K]) {
    setExternalForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadRequests() {
    if (!auth?.email) return;
    setRequestsLoading(true);
    setRequestsError(null);
    try {
      const res = await fetch(
        `${apiBase}/api/seed-research/drafts?email=${encodeURIComponent(auth.email)}&type=all`,
        {
          headers: { "x-user-email": auth.email },
        }
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

  async function handleSaveDraft() {
    if (!auth?.email) {
      setSaveError("Missing user email. Please sign in again.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const isUpdate = Boolean(editingId);
      const endpoint = isUpdate
        ? `${apiBase}/api/seed-research/drafts/${editingId}`
        : `${apiBase}/api/seed-research/drafts`;
      const method = isUpdate ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-user-email": auth.email,
        },
        body: JSON.stringify({
          userEmail: auth.email,
          data: activeForm === "event" ? eventForm : activeForm === "laptop" ? laptopForm : activeForm === "external" ? externalForm : form,
          upload: selectedUpload
            ? { key: selectedUpload.key, url: selectedUpload.url }
            : {},
          approvalAuthority:
            activeForm === "event"
              ? eventForm.approvalAuthority
              : activeForm === "laptop"
              ? laptopForm.approvalAuthority
              : activeForm === "external"
              ? externalForm.approvalAuthority
              : form.approvalAuthority,
          requestType: activeRequestType,
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to save draft");
      }

      const data = await res.json();
      setSaveSuccess(`Draft saved (id: ${data.id || editingId || "new"}).`);
      setActiveForm(null);
      setSelectedUpload(null);
      setForm(initialFormState());
      setEventForm(initialConferenceFormState());
      setLaptopForm(initialLaptopFormState());
      setExternalForm(initialExternalFormState());
      setEditingId(null);
      loadRequests();
    } catch (err) {
      console.error("Save draft failed", err);
      setSaveError("Failed to save draft. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleSelect(grantType: string, option?: string) {
    if (grantType === "Seed grant" && option === "Research project") {
      setActiveRequestType("seed-research");
      setActiveForm("research-project");
      setShowApply(false);
      setEditingId(null);
      setForm(initialFormState());
      setSelectedUpload(null);
      return;
    }

    if (grantType === "Seed grant" && option) {
      const mapped = option.toLowerCase();
      if (mapped === "conference" || mapped === "workshop" || mapped === "fdp") {
        setActiveRequestType(mapped as typeof activeRequestType);
        setActiveForm("event");
        setShowApply(false);
        setEditingId(null);
        setEventForm(initialConferenceFormState());
        setSelectedUpload(null);
        return;
      }

      if (mapped === "laptop grant") {
        setActiveRequestType("laptop-grant");
        setActiveForm("laptop");
        setShowApply(false);
        setEditingId(null);
        setLaptopForm(initialLaptopFormState());
        setSelectedUpload(null);
        return;
      }

      if (mapped === "external funding") {
        setActiveRequestType("external-funding");
        setActiveForm("external");
        setShowApply(false);
        setEditingId(null);
        setExternalForm(initialExternalFormState());
        setSelectedUpload(null);
        return;
      }
    }

    if (grantType === "External funding" && option) {
      setActiveRequestType("external-funding");
      setActiveForm("external");
      setShowApply(false);
      setEditingId(null);
      setExternalForm(initialExternalFormState());
      setSelectedUpload(null);
      return;
    }

    // Other options can be wired later
    setShowApply(false);
  }

  function closeForm() {
    setActiveForm(null);
    setSelectedUpload(null);
    setEditingId(null);
    setForm(initialFormState());
    setEventForm(initialConferenceFormState());
    setLaptopForm(initialLaptopFormState());
    setExternalForm(initialExternalFormState());
  }

  async function loadApprovers() {
    setApproversLoading(true);
    setApproversError(null);
    try {
      const res = await fetch(`${apiBase}/api/users/approvers`, {
        headers: auth?.email ? { "x-user-email": auth.email } : {},
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load approvers");
      }
      const data = await res.json();
      setApprovers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load approvers", err);
      setApproversError("Could not load approval authorities.");
    } finally {
      setApproversLoading(false);
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
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">User</p>
              <h1 className="text-3xl font-semibold">My requests</h1>
              <p className="text-sm text-slate-600">Manage and create your grant requests.</p>
            </div>
            <button
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 sm:mt-0"
              onClick={() => setShowApply(true)}
            >
              Apply
            </button>
          </header>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">My requests</h2>
              <button
                className="text-sm font-medium text-slate-600 underline transition hover:text-slate-900"
                onClick={loadRequests}
                disabled={requestsLoading}
              >
                {requestsLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {/* Search and Filter Section */}
            <div className="mb-6 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search requests by title..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 pl-10 text-sm placeholder-slate-400 focus:border-slate-500 focus:bg-white focus:outline-none"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              </div>

              {/* Filters Row */}
              <div className="flex flex-wrap gap-3 md:flex-nowrap">
                {/* Status Filter */}
                <div className="flex-1 min-w-36">
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(e.target.value as "all" | "draft" | "approved")
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  >
                    <option value="all">All statuses</option>
                    <option value="draft">Draft</option>
                    <option value="approved">Approved</option>
                  </select>
                </div>

                {/* Type Filter */}
                <div className="flex-1 min-w-36">
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Request Type
                  </label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  >
                    <option value="all">All types</option>
                    {uniqueRequestTypes.map((type) => (
                      <option key={type} value={type || ""}>
                        {type || "Unknown"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div className="flex-1 min-w-36">
                  <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                    Sort
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "recent" | "oldest")}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
                  >
                    <option value="recent">Most recent</option>
                    <option value="oldest">Oldest first</option>
                  </select>
                </div>

                {/* Clear Filters Button */}
                {(searchTerm || filterStatus !== "all" || filterType !== "all") && (
                  <div className="flex items-end">
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setFilterStatus("all");
                        setFilterType("all");
                      }}
                      className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>

              {/* Filter Status Indicator */}
              {(searchTerm || filterStatus !== "all" || filterType !== "all") && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 6h18M8 6v12M16 6v12"></path>
                  </svg>
                  <span>
                    Showing {filteredRequests.length} of {requests.length} request
                    {requests.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Requests Display */}
            {/* Requests Display */}
            {requestsError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-800">{requestsError}</p>
              </div>
            )}
            {requestsLoading && (
              <div className="py-12 text-center">
                <div className="inline-flex h-8 w-8 animate-spin rounded-full border 4 border-slate-300 border-t-slate-900"></div>
                <p className="mt-3 text-sm text-slate-600">Loading your requests...</p>
              </div>
            )}
            {!requestsLoading && !requests.length && !requestsError && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 py-12 text-center">
                <svg
                  className="mx-auto mb-3 h-12 w-12 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-sm font-medium text-slate-900">No requests yet</p>
                <p className="mt-1 text-sm text-slate-600">Click the Apply button to create your first request.</p>
              </div>
            )}
            {!requestsLoading && !filteredRequests.length && requests.length > 0 && !requestsError && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 py-12 text-center">
                <svg
                  className="mx-auto mb-3 h-12 w-12 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <p className="text-sm font-medium text-slate-900">No matching requests</p>
                <p className="mt-1 text-sm text-slate-600">Try adjusting your filters or search terms.</p>
              </div>
            )}
            <div className="grid gap-3">
              {filteredRequests.map((req) => {
                const title = (() => {
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
                    if ((req.request_type || "") === "external-funding") {
                      return parsed.projectTitle || "External funding";
                    }
                    return parsed.proposalTitle || parsed.eventTitle || "Untitled";
                  } catch (err) {
                    return "Untitled";
                  }
                })();

                const statusIcon =
                  req.status === "approved" ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                      <svg
                        className="h-4 w-4 text-green-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                      <svg
                        className="h-4 w-4 text-amber-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  );

                return (
                  <div
                    key={req.id}
                    className="group rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-md"
                  >
                    <div className="flex items-start gap-4">
                      {statusIcon}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {title}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {req.status}
                          </span>
                          {req.request_type && (
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 capitalize">
                              {req.request_type.replace(/-/g, " ")}
                            </span>
                          )}
                        </div>
                        {req.updated_at && (
                          <p className="mt-2 text-xs text-slate-500">
                            Updated {new Date(req.updated_at).toLocaleDateString()}{" "}
                            at {new Date(req.updated_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        )}
                      </div>
                      <Link
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 whitespace-nowrap"
                        href={`/dashboard/user/requests/${req.id}`}
                      >
                        <svg
                          className="mr-1.5 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        View
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {showApply && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4 py-10">
          <div className="relative w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Apply</p>
                <h2 className="text-2xl font-semibold">Choose your grant type</h2>
                <p className="text-sm text-slate-600">Select a path to start your application.</p>
              </div>
              <button
                className="rounded-md px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
                onClick={() => setShowApply(false)}
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Seed grant</p>
                    <p className="text-base font-semibold text-slate-900">Internal funding options</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {seedOptions.map((label) => (
                    <button
                      key={label}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-100"
                      onClick={() => handleSelect("Seed grant", label)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">External funding</p>
                    <p className="text-base font-semibold text-slate-900">Agency/industry funding</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {externalOptions.map((label) => (
                    <button
                      key={label}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-100"
                      onClick={() => handleSelect("External funding", label)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ResearchProjectFormModal
        open={activeForm === "research-project"}
        onClose={closeForm}
        form={form}
        updateField={updateField}
        handleSaveDraft={handleSaveDraft}
        saving={saving}
        saveError={saveError}
        saveSuccess={saveSuccess}
        selectedUpload={selectedUpload}
        setSelectedUpload={setSelectedUpload}
        approvers={approvers}
        approversLoading={approversLoading}
        approversError={approversError}
        authEmail={auth?.email || undefined}
        apiBase={apiBase}
      />

      <ConferenceFormModal
        open={activeForm === "event"}
        onClose={closeForm}
        form={eventForm}
        updateField={updateEventField}
        handleSaveDraft={handleSaveDraft}
        saving={saving}
        saveError={saveError}
        saveSuccess={saveSuccess}
        selectedUpload={selectedUpload}
        setSelectedUpload={setSelectedUpload}
        approvers={approvers}
        approversLoading={approversLoading}
        approversError={approversError}
        authEmail={auth?.email || undefined}
        apiBase={apiBase}
      />

      <LaptopFormModal
        open={activeForm === "laptop"}
        onClose={closeForm}
        form={laptopForm}
        updateField={updateLaptopField}
        handleSaveDraft={handleSaveDraft}
        saving={saving}
        saveError={saveError}
        saveSuccess={saveSuccess}
        approvers={approvers}
        approversLoading={approversLoading}
        approversError={approversError}
        authEmail={auth?.email || undefined}
        apiBase={apiBase}
      />

      <ExternalFundingFormModal
        open={activeForm === "external"}
        onClose={closeForm}
        form={externalForm}
        updateField={updateExternalField}
        handleSaveDraft={handleSaveDraft}
        saving={saving}
        saveError={saveError}
        saveSuccess={saveSuccess}
        approvers={approvers}
        approversLoading={approversLoading}
        approversError={approversError}
        authEmail={auth?.email || undefined}
        apiBase={apiBase}
      />
    </main>
  );
}
