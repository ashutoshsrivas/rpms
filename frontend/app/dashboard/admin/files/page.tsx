"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, readAuth } from "../../../lib/authStorage";

type FileUsage = {
  total: number;
  byStatus: {
    draft: number;
    submitted: number;
    "in-review": number;
    approved: number;
    rejected: number;
  };
  hasApprovedUsage: boolean;
  canDelete: boolean;
};

type FileRecord = {
  id: number;
  original_name: string;
  key: string;
  url: string;
  mimetype: string;
  size: number;
  uploader_email: string;
  created_at: string;
  usage: FileUsage;
};

function formatDate(input?: string) {
  if (!input) return "N/A";
  const d = new Date(input);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatFileSize(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

export default function AdminFilesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState(readAuth());
  const [mounted, setMounted] = useState(false);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterUploader, setFilterUploader] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileRecord | null>(null);

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
    if (mounted && auth?.token) {
      loadFiles();
    }
  }, [mounted, auth?.token]);

  function authHeaders() {
    return {
      Authorization: `Bearer ${auth?.token || ""}`,
      "x-user-email": auth?.email || "",
    };
  }

  async function loadFiles() {
    if (!auth?.token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/uploads/admin/all`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load files");
      }
      const data: FileRecord[] = await res.json();
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load files", err);
      setError("Unable to load files");
    } finally {
      setLoading(false);
    }
  }

  async function updateFileName(fileId: number) {
    if (!editName.trim()) {
      setError("File name cannot be empty");
      return;
    }

    setUpdating(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/uploads/admin/${fileId}`, {
        method: "PATCH",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ original_name: editName }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to update file");
      }

      const updated = await res.json();
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, original_name: updated.original_name } : f))
      );
      setEditingId(null);
      setEditName("");
    } catch (err) {
      console.error("Failed to update file", err);
      setError("Failed to update file name");
    } finally {
      setUpdating(false);
    }
  }

  function startEdit(file: FileRecord) {
    setEditingId(file.id);
    setEditName(file.original_name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  function initiateDelete(file: FileRecord) {
    setFileToDelete(file);
    setShowDeleteModal(true);
  }

  async function confirmDelete() {
    if (!fileToDelete) return;

    setDeleting(fileToDelete.id);
    setError(null);
    setShowDeleteModal(false);

    try {
      const res = await fetch(`${apiBase}/api/uploads`, {
        method: "DELETE",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key: fileToDelete.key }),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to delete file");
      }

      setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
      setFileToDelete(null);
    } catch (err) {
      console.error("Failed to delete file", err);
      setError("Failed to delete file");
    } finally {
      setDeleting(null);
    }
  }

  function cancelDelete() {
    setShowDeleteModal(false);
    setFileToDelete(null);
  }

  function handleSignOut() {
    clearAuth();
    router.replace("/signin");
  }

  // Filter and search logic
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const matchesSearch =
        searchTerm === "" ||
        file.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.uploader_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.key.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesUploader = filterUploader === "all" || file.uploader_email === filterUploader;

      const matchesType =
        filterType === "all" ||
        (filterType === "pdf" && file.mimetype.includes("pdf")) ||
        (filterType === "image" && file.mimetype.includes("image")) ||
        (filterType === "video" && file.mimetype.includes("video")) ||
        (filterType === "document" && (file.mimetype.includes("word") || file.mimetype.includes("document")));

      return matchesSearch && matchesUploader && matchesType;
    });
  }, [files, searchTerm, filterUploader, filterType]);

  const uniqueUploaders = useMemo(() => {
    const uploaders = new Set(files.map((f) => f.uploader_email));
    return Array.from(uploaders).sort();
  }, [files]);

  const stats = useMemo(() => {
    const total = files.length;
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const withApprovedUsage = files.filter((f) => f.usage.hasApprovedUsage).length;
    const canDelete = files.filter((f) => f.usage.canDelete).length;

    return { total, totalSize, withApprovedUsage, canDelete };
  }, [files]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto max-w-screen-2xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">ADMIN</p>
              <h1 className="text-2xl font-semibold text-slate-900">File Management</h1>
            </div>
            <button
              className="inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-screen-2xl px-4">
          <div className="flex gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "border-slate-900 text-slate-900"
                      : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-screen-2xl px-4 py-8">
        {/* Stats Cards */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Files</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.total}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Total Storage</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{formatFileSize(stats.totalSize)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">In Approved Docs</p>
            <p className="mt-2 text-3xl font-semibold text-rose-600">{stats.withApprovedUsage}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Can Delete</p>
            <p className="mt-2 text-3xl font-semibold text-green-600">{stats.canDelete}</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Search</label>
              <input
                type="text"
                placeholder="File name, uploader, or key..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">Uploader</label>
              <select
                value={filterUploader}
                onChange={(e) => setFilterUploader(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="all">All uploaders</option>
                {uniqueUploaders.map((email) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-600">File Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
              >
                <option value="all">All types</option>
                <option value="pdf">PDF</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="document">Documents</option>
              </select>
            </div>
          </div>
        </div>

        {/* Files Table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">All Files</p>
                <p className="text-xs text-slate-500">
                  Showing {filteredFiles.length} of {files.length} files
                </p>
              </div>
              <button
                className="text-xs font-medium text-slate-600 underline"
                onClick={loadFiles}
                type="button"
              >
                Refresh
              </button>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">File Name</th>
                  <th className="px-4 py-3 font-semibold">Uploader</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Size</th>
                  <th className="px-4 py-3 font-semibold">Usage</th>
                  <th className="px-4 py-3 font-semibold">Uploaded</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {loading && (
                  <tr>
                    <td className="px-4 py-4 text-slate-600" colSpan={7}>
                      Loading files...
                    </td>
                  </tr>
                )}
                {!loading && filteredFiles.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-slate-600" colSpan={7}>
                      No files found
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        {editingId === file.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                              autoFocus
                            />
                            <button
                              onClick={() => updateFileName(file.id)}
                              disabled={updating}
                              className="rounded bg-slate-900 px-2 py-1 text-xs text-white hover:bg-slate-800"
                            >
                              {updating ? "..." : "Save"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold text-slate-900">{file.original_name}</p>
                            <p className="text-xs text-slate-500">{file.key}</p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{file.uploader_email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                          {file.mimetype}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatFileSize(file.size)}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">{file.usage.total} total</p>
                          <div className="flex flex-wrap gap-1 text-xs">
                            {file.usage.byStatus.approved > 0 && (
                              <span className="rounded bg-rose-100 px-1.5 py-0.5 text-rose-700">
                                {file.usage.byStatus.approved} approved
                              </span>
                            )}
                            {file.usage.byStatus["in-review"] > 0 && (
                              <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-yellow-700">
                                {file.usage.byStatus["in-review"]} reviewing
                              </span>
                            )}
                            {file.usage.byStatus.submitted > 0 && (
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
                                {file.usage.byStatus.submitted} submitted
                              </span>
                            )}
                            {file.usage.byStatus.draft > 0 && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-700">
                                {file.usage.byStatus.draft} draft
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDate(file.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-slate-900 underline hover:text-slate-700"
                          >
                            View
                          </a>
                          {editingId !== file.id && (
                            <button
                              onClick={() => startEdit(file)}
                              className="text-xs font-medium text-blue-600 underline hover:text-blue-800"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => initiateDelete(file)}
                            disabled={deleting === file.id}
                            className="text-xs font-medium text-red-600 underline hover:text-red-800 disabled:opacity-50"
                          >
                            {deleting === file.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && fileToDelete && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/70">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-xl font-semibold text-slate-900">Delete File?</h3>
              <p className="mt-1 text-sm text-slate-600">{fileToDelete.original_name}</p>
            </div>

            <div className="space-y-4 p-6">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">File Usage Summary</p>
                  <p className="text-2xl font-bold text-slate-900">{fileToDelete.usage.total}</p>
                </div>
                <p className="text-xs text-slate-600">
                  This file is currently used in {fileToDelete.usage.total}{" "}
                  {fileToDelete.usage.total === 1 ? "place" : "places"} across the system.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Usage by Status:</p>
                <div className="grid grid-cols-2 gap-2">
                  {fileToDelete.usage.byStatus.draft > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-xs text-slate-600">Draft</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {fileToDelete.usage.byStatus.draft}
                      </p>
                    </div>
                  )}
                  {fileToDelete.usage.byStatus.submitted > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-xs text-slate-600">Submitted</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {fileToDelete.usage.byStatus.submitted}
                      </p>
                    </div>
                  )}
                  {fileToDelete.usage.byStatus["in-review"] > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-xs text-slate-600">In Review</p>
                      <p className="text-lg font-semibold text-yellow-600">
                        {fileToDelete.usage.byStatus["in-review"]}
                      </p>
                    </div>
                  )}
                  {fileToDelete.usage.byStatus.approved > 0 && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                      <p className="text-xs text-rose-600">Approved</p>
                      <p className="text-lg font-semibold text-rose-700">
                        {fileToDelete.usage.byStatus.approved}
                      </p>
                    </div>
                  )}
                  {fileToDelete.usage.byStatus.rejected > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-xs text-slate-600">Rejected</p>
                      <p className="text-lg font-semibold text-slate-700">
                        {fileToDelete.usage.byStatus.rejected}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {fileToDelete.usage.hasApprovedUsage && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                  <p className="mb-1 text-sm font-semibold text-rose-800">⚠️ Cannot Delete</p>
                  <p className="text-sm text-rose-700">
                    This file is used in {fileToDelete.usage.byStatus.approved} approved document
                    {fileToDelete.usage.byStatus.approved !== 1 ? "s" : ""}. Files used in approved
                    documents cannot be deleted to maintain document integrity.
                  </p>
                </div>
              )}

              {!fileToDelete.usage.hasApprovedUsage && fileToDelete.usage.total > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="mb-1 text-sm font-semibold text-yellow-800">⚠️ Warning</p>
                  <p className="text-sm text-yellow-700">
                    Deleting this file will affect {fileToDelete.usage.total}{" "}
                    {fileToDelete.usage.total === 1 ? "area" : "areas"}. This action cannot be undone.
                  </p>
                </div>
              )}

              {!fileToDelete.usage.hasApprovedUsage && fileToDelete.usage.total === 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="mb-1 text-sm font-semibold text-green-800">✓ Safe to Delete</p>
                  <p className="text-sm text-green-700">
                    This file is not currently being used anywhere. It's safe to delete.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={cancelDelete}
                type="button"
              >
                Cancel
              </button>
              {fileToDelete.usage.canDelete && (
                <button
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={confirmDelete}
                  type="button"
                  disabled={deleting === fileToDelete.id}
                >
                  {deleting === fileToDelete.id ? "Deleting..." : "Delete File"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
