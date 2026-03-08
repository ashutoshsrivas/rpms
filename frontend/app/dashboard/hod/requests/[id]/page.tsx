"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useParams } from "next/navigation";
import UploadPicker, { UploadedRecord } from "../../../../components/UploadPicker";
import { clearAuth, readAuth } from "../../../../lib/authStorage";

type RequestStatus = "draft" | "submitted" | "in-review" | "approved" | "rejected" | string;

type RequestRow = {
  id: number;
  user_email: string;
  request_type?: string;
  approval_authority?: string | null;
  status: RequestStatus;
  upload_key?: string | null;
  upload_url?: string | null;
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

type PrivateFile = ChatAttachment;

type ChatMessage = {
  id: number;
  request_id: number;
  sender_email: string;
  content: string;
  created_at?: string;
  attachments?: ChatAttachment[];
};

function isPrimitive(value: unknown) {
  return value === null || ["string", "number", "boolean", "undefined"].includes(typeof value);
}

// Renders nested request data as readable key/value tiles instead of raw JSON.
function DataPreview({ value }: { value: any }) {
  if (isPrimitive(value)) {
    return <span className="text-slate-900">{value === null || value === undefined ? "—" : String(value)}</span>;
  }

  if (Array.isArray(value)) {
    return (
      <div className="space-y-2">
        {value.map((item, idx) => (
          <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <DataPreview value={item} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, any>);
    if (!entries.length) return <span className="text-slate-500">No details</span>;
    return (
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {entries.map(([key, val]) => (
          <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{key}</dt>
            <dd className="mt-1 text-sm text-slate-900">
              <DataPreview value={val} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return <span className="text-slate-900">{String(value)}</span>;
}

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

export default function HodRequestDetailPage() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const [auth, setAuth] = useState(readAuth());
  const [mounted, setMounted] = useState(false);
  const [request, setRequest] = useState<RequestRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<RequestStatus | null>(null);
  const [dataModalOpen, setDataModalOpen] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatOrphanAttachments, setChatOrphanAttachments] = useState<ChatAttachment[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatUploading, setChatUploading] = useState(false);
  const [chatUpload, setChatUpload] = useState<UploadedRecord | null>(null);

  const [privateFiles, setPrivateFiles] = useState<PrivateFile[]>([]);
  const [privateFilesLoading, setPrivateFilesLoading] = useState(false);
  const [privateFilesError, setPrivateFilesError] = useState<string | null>(null);
  const [privateUpload, setPrivateUpload] = useState<UploadedRecord | null>(null);
  const [privateUploading, setPrivateUploading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";
  const requestId = params?.id ? Number(params.id) : NaN;

  const navItems = useMemo(
    () => [
      { label: "Overview", href: "/dashboard/hod" },
      { label: "Department requests", href: "/dashboard/hod/requests" },
      { label: "Profile", href: "/dashboard/hod/profile" },
    ],
    []
  );

  const chatTimeline = useMemo(() => {
    const toTime = (value?: string | null) => (value ? new Date(value).getTime() : 0);
    const items = [
      ...chatMessages.map((msg) => ({ kind: "message" as const, created_at: msg.created_at, payload: msg })),
      ...chatOrphanAttachments.map((att) => ({ kind: "attachment" as const, created_at: att.created_at, payload: att })),
    ];
    return items.sort((a, b) => toTime(a.created_at) - toTime(b.created_at));
  }, [chatMessages, chatOrphanAttachments]);

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
    if (mounted && auth?.email && requestId) {
      loadRequest();
      loadChat();
      loadPrivateFiles();
    }
  }, [mounted, auth?.email, requestId]);

  async function loadRequest() {
    if (!auth?.email || !requestId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/requests/${requestId}`, {
        headers: { "x-user-email": auth.email },
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to fetch request");
      }
      const data = await res.json();
      setRequest(data);
    } catch (err) {
      console.error("Failed to fetch request", err);
      setError("Unable to load this request.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPrivateFiles() {
    if (!auth?.email || !requestId) return;
    setPrivateFilesLoading(true);
    setPrivateFilesError(null);
    try {
      const res = await fetch(`${apiBase}/api/requests/${requestId}/private-files`, {
        headers: { "x-user-email": auth.email },
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load private files");
      }
      const data = await res.json();
      setPrivateFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load private files", err);
      setPrivateFilesError("Unable to load private files");
    } finally {
      setPrivateFilesLoading(false);
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

  async function uploadPrivateFile() {
    if (!auth?.email || !requestId) return;
    if (!privateUpload) return;
    setPrivateUploading(true);
    try {
      const res = await fetch(`${apiBase}/api/requests/${requestId}/private-files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": auth.email,
        },
        body: JSON.stringify({
          senderEmail: auth.email,
          upload: { key: privateUpload.key, url: privateUpload.url },
        }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to upload private file");
      }
      setPrivateUpload(null);
      loadPrivateFiles();
    } catch (err) {
      console.error("Failed to upload private file", err);
      setPrivateFilesError("Failed to upload private file");
    } finally {
      setPrivateUploading(false);
    }
  }

  async function updateStatus(nextStatus: RequestStatus) {
    if (!auth?.email || !requestId) return;
    setStatusUpdating(nextStatus);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/requests/${requestId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": auth.email,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to update status");
      }
      await loadRequest();
    } catch (err) {
      console.error("Failed to update status", err);
      setError("Unable to update status. Please try again.");
    } finally {
      setStatusUpdating(null);
    }
  }

  function handleSignOut() {
    clearAuth();
    router.replace("/signin");
  }

  const parsedData = useMemo(() => {
    if (!request?.data) return null;
    try {
      if (typeof request.data === "string") return JSON.parse(request.data);
      return request.data;
    } catch (err) {
      return request.data;
    }
  }, [request]);

  const requestTitle = useMemo(() => {
    if (!request) return "Request";
    const type = (request.request_type || "seed-research").toLowerCase();
    if (type === "conference" || type === "workshop" || type === "fdp") return "Event";
    if (type === "laptop-grant") return "Laptop grant";
    if (type === "external-funding") return "External funding";
    return "Seed research";
  }, [request]);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 pb-28">
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
          <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">HOD</p>
              <h1 className="text-3xl font-semibold">{requestTitle}</h1>
              <p className="text-sm text-slate-600">Review, approve, and chat with the requester.</p>
              {request?.request_type && (
                <p className="text-xs font-medium text-slate-500">Type: {request.request_type}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/dashboard/hod/requests"
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
              >
                Back to list
              </Link>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClasses(request?.status || "")}`}>
                {request?.status || "unknown"}
              </span>
              <button
                className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-amber-300"
                onClick={() => updateStatus("in-review")}
                disabled={statusUpdating !== null || !["draft"].includes((request?.status || "").toString().toLowerCase())}
              >
                {statusUpdating === "in-review" ? "Updating..." : "Mark in review"}
              </button>
              <button
                className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
                onClick={() => updateStatus("submitted")}
                disabled={
                  statusUpdating !== null ||
                  !["draft", "in-review"].includes((request?.status || "").toString().toLowerCase())
                }
              >
                {statusUpdating === "submitted" ? "Sending..." : "Submit to Admin"}
              </button>
            </div>
          </header>

          {loading && <p className="text-sm text-slate-600">Loading request...</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}

          {!loading && !error && request && (
            <div className="space-y-4">
              <div className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Owner</p>
                  <p className="text-lg font-semibold text-slate-900">{request.user_email}</p>
                  {request.approval_authority && (
                    <p className="text-sm text-slate-600">Authority: {request.approval_authority}</p>
                  )}
                  {request.upload_url && (
                    <Link className="text-sm font-semibold text-slate-800 underline" href={request.upload_url} target="_blank">
                      View attachment
                    </Link>
                  )}
                </div>
                <div className="text-right text-xs text-slate-500">
                  {request.created_at && <p>Created: {formatDate(request.created_at)}</p>}
                  {request.updated_at && <p>Updated: {formatDate(request.updated_at)}</p>}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Request data</p>
                    <p className="text-xs text-slate-500">Open to view formatted details.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(request.status)}`}>
                      {request.status}
                    </span>
                    <button
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                      onClick={() => setDataModalOpen(true)}
                    >
                      View details
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Private documents</p>
                      <p className="text-xs text-slate-500">Only HOD and Admin can see these files.</p>
                    </div>
                    <button
                      className="text-xs font-medium text-slate-600 underline"
                      onClick={loadPrivateFiles}
                      type="button"
                    >
                      Refresh
                    </button>
                  </div>
                  {privateFilesError && <p className="text-xs text-rose-600">{privateFilesError}</p>}
                  {privateFilesLoading && <p className="text-sm text-slate-600">Loading private files...</p>}
                  {!privateFilesLoading && !privateFiles.length && !privateFilesError && (
                    <p className="text-sm text-slate-600">No private files yet.</p>
                  )}
                  <div className="space-y-2">
                    {privateFiles.map((file) => (
                      <div
                        key={`private-${file.id}`}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{file.file_key}</p>
                          <p className="text-xs text-slate-600">Uploaded by {file.sender_email}</p>
                          {file.created_at && (
                            <p className="text-[11px] uppercase tracking-wide text-slate-500">{formatDate(file.created_at)}</p>
                          )}
                        </div>
                        <Link className="text-sm font-semibold text-slate-900 underline" href={file.file_url} target="_blank">
                          View
                        </Link>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <UploadPicker
                      apiBase={apiBase}
                      userEmail={auth?.email || ""}
                      value={privateUpload}
                      onChange={setPrivateUpload}
                      buttonLabel="Select or upload private file"
                    />
                    <button
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      onClick={uploadPrivateFile}
                      disabled={privateUploading || !privateUpload}
                    >
                      {privateUploading ? "Saving..." : "Save private file"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex max-h-[70vh] min-h-[420px] flex-col gap-3 overflow-hidden">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Conversation</p>
                  {chatError && <p className="text-xs text-rose-600">{chatError}</p>}
                </div>
                {chatLoading && <p className="text-sm text-slate-600">Loading chat...</p>}
                {!chatLoading && !chatMessages.length && !chatError && (
                  <p className="text-sm text-slate-600">No messages yet. Start the conversation below.</p>
                )}
                <div className="flex-1 min-h-0 space-y-3 overflow-y-auto pr-2">
                  {chatTimeline.map((item) => {
                    if (item.kind === "message") {
                      const msg = item.payload;
                      const isActor = auth?.email && msg.sender_email?.toLowerCase() === auth.email.toLowerCase();
                      return (
                        <div key={`msg-${msg.id}`} className={"flex gap-3 " + (isActor ? "justify-end" : "justify-start")}>
                          {!isActor && <div className="h-8 w-8 rounded-full bg-slate-200" aria-hidden="true" />}
                          <div
                            className={
                              "max-w-xl rounded-2xl px-4 py-3 text-sm shadow " +
                              (isActor ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800")
                            }
                          >
                            <p className="text-xs font-semibold uppercase tracking-wide">{isActor ? "You" : msg.sender_email}</p>
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
                              <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{formatDate(msg.created_at)}</p>
                            )}
                          </div>
                          {isActor && <div className="h-8 w-8 rounded-full bg-slate-800" aria-hidden="true" />}
                        </div>
                      );
                    }

                    const att = item.payload;
                    const isActor = auth?.email && att.sender_email?.toLowerCase() === auth.email.toLowerCase();
                    return (
                      <div key={`orphan-${att.id}`} className={"flex gap-3 " + (isActor ? "justify-end" : "justify-start")}>
                        {!isActor && <div className="h-8 w-8 rounded-full bg-slate-200" aria-hidden="true" />}
                        <div
                          className={
                            "max-w-xl rounded-2xl px-4 py-3 text-sm shadow " +
                            (isActor ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800")
                          }
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide">{isActor ? "You" : att.sender_email}</p>
                          <p className="mt-1 text-[13px] font-semibold">Attachment</p>
                          <Link className="text-xs font-semibold underline" href={att.file_url} target="_blank">
                            {att.file_key}
                          </Link>
                          {att.created_at && (
                            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">{formatDate(att.created_at)}</p>
                          )}
                        </div>
                        {isActor && <div className="h-8 w-8 rounded-full bg-slate-800" aria-hidden="true" />}
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

      {dataModalOpen && request && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/60 px-4 py-8">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Request details</p>
                <p className="text-lg font-semibold text-slate-900">{requestTitle}</p>
              </div>
              <button
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setDataModalOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <DataPreview value={parsedData ?? request.data ?? {}} />
            </div>
          </div>
        </div>
      )}

      {request && (
        <div className="sticky bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:ml-72">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <textarea
              className="flex-1 min-h-[88px] resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
              placeholder="Write a message or approval note..."
              rows={2}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
            />
            <div className="flex items-center gap-2 sm:flex-col sm:items-stretch sm:justify-end sm:gap-2">
              <UploadPicker apiBase={apiBase} userEmail={auth?.email || ""} value={chatUpload} onChange={setChatUpload} />
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
    </main>
  );
}
