"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useParams } from "next/navigation";
import UploadPicker, { UploadedRecord } from "../../../../components/UploadPicker";
import ResearchProjectFormModal from "../ResearchProjectFormModal";
import { Approver } from "../ResearchProjectFormModal";
import { initialFormState, ResearchFormState } from "../formState";
import ExternalFundingFormModal from "../ExternalFundingFormModal";
import { ExternalFormState, initialExternalFormState } from "../externalFormState";
import { clearAuth, readAuth } from "../../../../lib/authStorage";

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

type ChatAttachment = {
  id: number;
  request_id: number;
  chat_message_id?: number | null;
  sender_email: string;
  file_key: string;
  file_url: string;
  created_at?: string;
};

type ChatMessage = {
  id: number;
  request_id: number;
  sender_email: string;
  content: string;
  created_at?: string;
  attachments?: ChatAttachment[];
};

type PostApprovalRequirement = {
  id: number;
  request_id: number;
  label: string;
  status: string;
  created_by?: string;
  created_at?: string;
  submission_id?: number | null;
  file_key?: string | null;
  file_url?: string | null;
  uploader_email?: string | null;
  note?: string | null;
  submitted_at?: string | null;
};

export default function RequestDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const [auth, setAuth] = useState(readAuth());
  const [mounted, setMounted] = useState(false);
  const [request, setRequest] = useState<ResearchRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ResearchFormState>(initialFormState());
  const [externalForm, setExternalForm] = useState<ExternalFormState>(initialExternalFormState());
  const [selectedUpload, setSelectedUpload] = useState<UploadedRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [activeForm, setActiveForm] = useState<"research-project" | "external" | null>(null);
  const [approvers, setApprovers] = useState<Approver[]>([]);
  const [approversLoading, setApproversLoading] = useState(false);
  const [approversError, setApproversError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatOrphanAttachments, setChatOrphanAttachments] = useState<ChatAttachment[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatUploading, setChatUploading] = useState(false);
  const [chatUpload, setChatUpload] = useState<UploadedRecord | null>(null);

  const [requirements, setRequirements] = useState<PostApprovalRequirement[]>([]);
  const [requirementsLoading, setRequirementsLoading] = useState(false);
  const [requirementsError, setRequirementsError] = useState<string | null>(null);
  const [requirementsSubmitting, setRequirementsSubmitting] = useState<Record<number, boolean>>({});
  const [requirementUploads, setRequirementUploads] = useState<Record<number, UploadedRecord | null>>({});
  const [requirementNotes, setRequirementNotes] = useState<Record<number, string>>({});
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const chatTimeline = useMemo(() => {
    const toTime = (value?: string | null) => (value ? new Date(value).getTime() : 0);
    const items = [
      ...chatMessages.map((msg) => ({ kind: "message" as const, created_at: msg.created_at, payload: msg })),
      ...chatOrphanAttachments.map((att) => ({ kind: "attachment" as const, created_at: att.created_at, payload: att })),
    ];
    return items.sort((a, b) => toTime(a.created_at) - toTime(b.created_at));
  }, [chatMessages, chatOrphanAttachments]);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
  const requestId = params?.id ? Number(params.id) : NaN;

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
      loadRequest();
      loadApprovers();
      loadChat();
      loadRequirements();
    }
  }, [mounted, auth?.email]);

  const parsedData = useMemo(() => {
    if (!request?.data) return request?.request_type === "external-funding" ? initialExternalFormState() : initialFormState();
    try {
      const parsed = typeof request.data === "string" ? JSON.parse(request.data) : request.data || {};
      if (request.request_type === "external-funding") {
        return { ...initialExternalFormState(), ...parsed } as ExternalFormState;
      }
      return { ...initialFormState(), ...parsed } as ResearchFormState;
    } catch (err) {
      console.error("Failed to parse request data", err);
      return request?.request_type === "external-funding" ? initialExternalFormState() : initialFormState();
    }
  }, [request]);

  function handleSignOut() {
    clearAuth();
    router.replace("/signin");
  }

  function updateField<K extends keyof ResearchFormState>(key: K, value: ResearchFormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateExternalField<K extends keyof ExternalFormState>(key: K, value: ExternalFormState[K]) {
    setExternalForm((prev) => ({ ...prev, [key]: value }));
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

  async function loadChat() {
    if (!auth?.email || !requestId) return;
    setChatLoading(true);
    setChatError(null);
    try {
      const res = await fetch(`${apiBase}/api/requests/${requestId}/chat`, {
        headers: { "x-user-email": auth.email },
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load chat");
      }
      const data = await res.json();
      setChatMessages(Array.isArray(data?.messages) ? data.messages : []);
      setChatOrphanAttachments(Array.isArray(data?.orphanAttachments) ? data.orphanAttachments : []);
    } catch (err) {
      console.error("Failed to load chat", err);
      setChatError("Unable to load chat");
    } finally {
      setChatLoading(false);
    }
  }

  async function loadRequirements() {
    if (!auth?.email || !requestId) return;
    setRequirementsLoading(true);
    setRequirementsError(null);
    try {
      const res = await fetch(`${apiBase}/api/requests/${requestId}/post-approval/requirements`, {
        headers: { "x-user-email": auth.email },
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load requirements");
      }
      const data = await res.json();
      setRequirements(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load requirements", err);
      setRequirementsError("Could not load post-approval requirements.");
    } finally {
      setRequirementsLoading(false);
    }
  }

  async function submitRequirement(requirementId: number) {
    if (!auth?.email || !requestId) return;
    const upload = requirementUploads[requirementId];
    const note = requirementNotes[requirementId] || "";
    if (!upload) {
      setRequirementsError("Please attach a file before submitting.");
      return;
    }

    setRequirementsSubmitting((prev) => ({ ...prev, [requirementId]: true }));
    setRequirementsError(null);
    try {
      const res = await fetch(`${apiBase}/api/requests/${requestId}/post-approval/submissions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": auth.email,
        },
        body: JSON.stringify({ requirementId, upload: { key: upload.key, url: upload.url }, note }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to submit document");
      }
      await loadRequirements();
      setRequirementUploads((prev) => ({ ...prev, [requirementId]: null }));
      setRequirementNotes((prev) => ({ ...prev, [requirementId]: "" }));
    } catch (err) {
      console.error("Failed to submit requirement", err);
      setRequirementsError("Could not submit document. Please try again.");
    } finally {
      setRequirementsSubmitting((prev) => ({ ...prev, [requirementId]: false }));
    }
  }

  async function sendChatMessage() {
    if (!auth?.email || !requestId) return;
    if (!chatInput.trim() && !chatUpload) return;
    setChatUploading(true);
    try {
      const res = await fetch(`${apiBase}/api/requests/${requestId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": auth.email,
        },
        body: JSON.stringify({
          senderEmail: auth.email,
          content: chatInput.trim(),
          upload: chatUpload ? { key: chatUpload.key, url: chatUpload.url } : null,
        }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to send message");
      }
      setChatInput("");
      setChatUpload(null);
      loadChat();
    } catch (err) {
      console.error("Failed to send chat", err);
      setChatError("Failed to send message");
    } finally {
      setChatUploading(false);
    }
  }

  async function loadRequest() {
    if (!auth?.email || !requestId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/seed-research/drafts/${requestId}`, {
        headers: { "x-user-email": auth.email },
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to fetch request");
      }
      const data = await res.json();
      setRequest(data);
      try {
        const parsed = typeof data.data === "string" ? JSON.parse(data.data) : data.data || {};
        if (data.request_type === "external-funding") {
          setExternalForm({ ...initialExternalFormState(), ...parsed });
          setForm(initialFormState());
        } else {
          setForm({ ...initialFormState(), ...parsed });
          setExternalForm(initialExternalFormState());
        }
      } catch (err) {
        setForm(initialFormState());
        setExternalForm(initialExternalFormState());
      }
      if (data.upload_key && data.upload_url) {
        setSelectedUpload({
          key: data.upload_key,
          url: data.upload_url,
          mimetype: "",
          size: 1,
          original_name: data.upload_key,
        });
      } else {
        setSelectedUpload(null);
      }
    } catch (err) {
      console.error("Failed to fetch request", err);
      setError("Unable to load this submission.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDraft() {
    if (!auth?.email || !requestId) {
      setSaveError("Missing user email or request id. Please sign in again.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const isExternal = request?.request_type === "external-funding";
      const res = await fetch(`${apiBase}/api/seed-research/drafts/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": auth.email,
        },
        body: JSON.stringify({
          userEmail: auth.email,
          data: isExternal ? externalForm : form,
          upload: selectedUpload ? { key: selectedUpload.key, url: selectedUpload.url } : {},
          approvalAuthority: isExternal ? externalForm.approvalAuthority : form.approvalAuthority,
          requestType: request?.request_type || "seed-research",
        }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to save draft");
      }

      setSaveSuccess("Draft updated.");
      setActiveForm(null);
      loadRequest();
    } catch (err) {
      console.error("Save draft failed", err);
      setSaveError("Failed to save draft. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit() {
    setSaveSuccess(null);
    setSaveError(null);
    if (request?.request_type === "external-funding") {
      setActiveForm("external");
      return;
    }
    setActiveForm("research-project");
  }

  if (!mounted) return null;

  const title = (parsedData as any).proposalTitle || "Untitled";
  const isResearchType = !request?.request_type || request.request_type === "seed-research";
  const isExternalType = request?.request_type === "external-funding";
  const isEditableType = isResearchType || isExternalType;
  const eventTitle = (() => {
    if (request?.request_type === "conference" || request?.request_type === "workshop" || request?.request_type === "fdp") {
      if (request.data) {
        try {
          const parsed = typeof request.data === "string" ? JSON.parse(request.data) : request.data || {};
          return parsed.eventTitle || parsed.proposalTitle || "Untitled event";
        } catch (err) {
          return "Untitled event";
        }
      }
      return "Untitled event";
    }
    if (request?.request_type === "laptop-grant") {
      try {
        const parsed = typeof request.data === "string" ? JSON.parse(request.data) : request.data || {};
        return parsed.applicantName || "Laptop grant";
      } catch (err) {
        return "Laptop grant";
      }
    }
    if (request?.request_type === "external-funding") {
      try {
        const parsed = typeof request.data === "string" ? JSON.parse(request.data) : request.data || {};
        return parsed.projectTitle || "External funding";
      } catch (err) {
        return "External funding";
      }
    }
    return null;
  })();
  const displayTitle = eventTitle || title;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-28">
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
          <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">User</p>
              <h1 className="text-3xl font-semibold">Request detail</h1>
              <p className="text-sm text-slate-600">Chat-style view of your submission.</p>
              {request?.request_type && (
                <p className="text-xs font-medium text-slate-500">Type: {request.request_type}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/user/requests"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              >
                Back to list
              </Link>
              <button
                className={
                  "rounded-md px-4 py-2 text-sm font-semibold transition " +
                  (request?.status === "draft" && isEditableType
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed")
                }
                onClick={request?.status === "draft" && isEditableType ? openEdit : undefined}
                disabled={request?.status !== "draft" || !isEditableType}
                title={request?.status === "draft" && isEditableType ? "Edit your draft submission" : "Editing locked for this type or status"}
              >
                Edit submission
              </button>
            </div>
          </header>

          {loading && <p className="text-sm text-slate-600">Loading submission...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && request && (
            <div className="space-y-4">
              <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Title</p>
                  <h2 className="text-xl font-semibold text-slate-900">{displayTitle}</h2>
                  <p className="mt-1 text-sm text-slate-600">Status: {request.status}</p>
                  {request.approval_authority && (
                    <p className="text-sm text-slate-600">Approval authority: {request.approval_authority}</p>
                  )}
                  {request.upload_url && (
                    <Link className="text-sm font-semibold text-slate-800 underline" href={request.upload_url} target="_blank">
                      View attachment
                    </Link>
                  )}
                </div>
                <div className="text-right text-xs text-slate-500">
                  {request.created_at && <p>Created: {new Date(request.created_at).toLocaleString()}</p>}
                  {request.updated_at && <p>Updated: {new Date(request.updated_at).toLocaleString()}</p>}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Post-approval submissions</p>
                    <p className="text-sm text-slate-600">Upload documents requested after approval.</p>
                  </div>
                  <button
                    className="text-sm font-medium text-slate-700 underline"
                    onClick={loadRequirements}
                    disabled={requirementsLoading}
                  >
                    {requirementsLoading ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
                {requirementsError && <p className="mb-3 text-sm text-red-600">{requirementsError}</p>}
                {!requirementsLoading && !requirements.length && !requirementsError && (
                  <p className="text-sm text-slate-600">No post-approval documents have been requested.</p>
                )}
                {requirementsLoading && <p className="text-sm text-slate-600">Loading requirements…</p>}
                <div className="space-y-3">
                  {requirements.map((req) => {
                    const upload = requirementUploads[req.id] || null;
                    const note = requirementNotes[req.id] || "";
                    const submitted = Boolean(req.submission_id);
                    return (
                      <div key={req.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{req.label}</p>
                            <p className="text-xs text-slate-500">Status: {req.status}</p>
                            {req.submitted_at && (
                              <p className="text-xs text-slate-500">Submitted: {new Date(req.submitted_at).toLocaleString()}</p>
                            )}
                          </div>
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-800 capitalize">{req.status}</span>
                        </div>
                        {submitted && req.file_url && (
                          <div className="mt-2 text-sm text-slate-700">
                            <p className="font-semibold">Uploaded file</p>
                            <Link className="text-slate-900 underline" href={req.file_url} target="_blank">
                              {req.file_key || "View file"}
                            </Link>
                            {req.note && <p className="text-xs text-slate-600">Note: {req.note}</p>}
                          </div>
                        )}
                        {!submitted && req.status !== "fulfilled" && (
                          <div className="mt-3 space-y-2">
                            <UploadPicker
                              apiBase={apiBase}
                              userEmail={auth?.email || ""}
                              value={upload}
                              onChange={(file) => setRequirementUploads((prev) => ({ ...prev, [req.id]: file }))}
                              buttonLabel={upload ? "Change file" : "Select or upload file"}
                            />
                            <input
                              type="text"
                              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                              placeholder="Optional note"
                              value={note}
                              onChange={(e) => setRequirementNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                            />
                            <button
                              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                              onClick={() => submitRequirement(req.id)}
                              disabled={requirementsSubmitting[req.id] || !upload}
                            >
                              {requirementsSubmitting[req.id] ? "Submitting…" : "Submit document"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex max-h-[70vh] min-h-[420px] flex-col gap-3 overflow-hidden">
                <p className="text-sm font-semibold text-slate-800">Conversation</p>
                {chatLoading && <p className="text-sm text-slate-600">Loading chat...</p>}
                {chatError && <p className="text-sm text-red-600">{chatError}</p>}
                {!chatLoading && !chatMessages.length && !chatError && (
                  <p className="text-sm text-slate-600">No messages yet. Start the conversation below.</p>
                )}
                <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-2">
                  {chatTimeline.map((item) => {
                    if (item.kind === "message") {
                      const msg = item.payload;
                      const isUser = auth?.email && msg.sender_email?.toLowerCase() === auth.email.toLowerCase();
                      return (
                        <div
                          key={`msg-${msg.id}`}
                          className={"flex gap-3 " + (isUser ? "justify-end" : "justify-start")}
                        >
                          {!isUser && <div className="h-8 w-8 rounded-full bg-slate-200" aria-hidden="true" />}
                          <div
                            className={
                              "max-w-xl rounded-2xl px-4 py-3 text-sm shadow " +
                              (isUser ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800")
                            }
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide">{isUser ? "You" : msg.sender_email}</p>
                            {msg.content && <p className="mt-1 whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                            {msg.attachments?.length ? (
                              <div className="mt-2 space-y-1 text-xs">
                                {msg.attachments.map((att) => (
                                  <Link key={att.id} className="font-semibold underline" href={att.file_url} target="_blank">
                                    Attachment: {att.file_key}
                                  </Link>
                                ))}
                              </div>
                            ) : null}
                            {msg.created_at && (
                              <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                                {new Date(msg.created_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                          {isUser && <div className="h-8 w-8 rounded-full bg-slate-800" aria-hidden="true" />}
                        </div>
                      );
                    }

                    const att = item.payload;
                    const isUser = auth?.email && att.sender_email?.toLowerCase() === auth.email.toLowerCase();
                    return (
                      <div
                        key={`orphan-${att.id}`}
                        className={"flex gap-3 " + (isUser ? "justify-end" : "justify-start")}
                      >
                        {!isUser && <div className="h-8 w-8 rounded-full bg-slate-200" aria-hidden="true" />}
                        <div
                          className={
                            "max-w-xl rounded-2xl px-4 py-3 text-sm shadow " +
                            (isUser ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800")
                          }
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide">{isUser ? "You" : att.sender_email}</p>
                          <p className="mt-1 text-[13px] font-semibold">Attachment</p>
                          <Link className="text-xs font-semibold underline" href={att.file_url} target="_blank">
                            {att.file_key}
                          </Link>
                          {att.created_at && (
                            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">
                              {new Date(att.created_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                        {isUser && <div className="h-8 w-8 rounded-full bg-slate-800" aria-hidden="true" />}
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {request && (
        <div className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:ml-72">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
            <textarea
              className="flex-1 min-h-[88px] resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="Write a message..."
              rows={2}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <div className="flex items-center gap-2 sm:flex-col sm:items-stretch sm:justify-end sm:gap-2">
              <UploadPicker
                apiBase={apiBase}
                userEmail={auth?.email || ""}
                value={chatUpload}
                onChange={setChatUpload}
              />
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                onClick={sendChatMessage}
                disabled={chatUploading || (!chatInput.trim() && !chatUpload)}
              >
                {chatUploading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ResearchProjectFormModal
        open={activeForm === "research-project"}
        onClose={() => setActiveForm(null)}
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

      <ExternalFundingFormModal
        open={activeForm === "external"}
        onClose={() => setActiveForm(null)}
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
