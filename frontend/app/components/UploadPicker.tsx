"use client";

import { useState } from "react";
import { readAuth } from "../lib/authStorage";

// Bearer header from the stored JWT; identity/authorization is enforced server-side.
function authHeader(): Record<string, string> {
  const token = readAuth().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type UploadedRecord = {
  id?: number;
  original_name?: string;
  url: string;
  key: string;
  mimetype: string;
  size: number;
  uploader_email?: string;
  created_at?: string;
};

type FileUsage = {
  totalUsages: number;
  usageByStatus: {
    draft: number;
    submitted: number;
    "in-review": number;
    approved: number;
    rejected: number;
  };
  hasApprovedUsage: boolean;
  canDelete: boolean;
  details: {
    inRequests: number;
    inChatFiles: number;
    inPostApproval: number;
  };
};

type Props = {
  apiBase: string;
  userEmail: string;
  value: UploadedRecord | null;
  onChange: (file: UploadedRecord | null) => void;
  buttonLabel?: string;
};

export default function UploadPicker({ apiBase, userEmail, value, onChange, buttonLabel = "Select or upload file" }: Props) {
  const [showUploadPicker, setShowUploadPicker] = useState(false);
  const [uploads, setUploads] = useState<UploadedRecord[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [uploadsError, setUploadsError] = useState<string | null>(null);
  const [supportFile, setSupportFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [selectedFileForDeletion, setSelectedFileForDeletion] = useState<UploadedRecord | null>(null);
  const [fileUsage, setFileUsage] = useState<FileUsage | null>(null);
  const [checkingUsage, setCheckingUsage] = useState(false);

  async function loadUploads() {
    setUploadsLoading(true);
    setUploadsError(null);
    try {
      const res = await fetch(`${apiBase}/api/uploads`, {
        headers: {
          ...authHeader(),
        },
      });
      if (!res.ok) {
        const message = await res.text();
        setUploadsError(message || "Failed to fetch uploads");
        setUploads([]);
        return;
      }
      const data = await res.json();
      setUploads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch uploads", err);
      setUploadsError("Could not load uploads. Please try again.");
    } finally {
      setUploadsLoading(false);
    }
  }

  function openUploadPicker() {
    setShowUploadPicker(true);
    if (!uploads.length) {
      loadUploads();
    }
  }

  function closeUploadPicker() {
    setShowUploadPicker(false);
    setSupportFile(null);
    setUploadError(null);
  }

  async function handleSupportUpload() {
    if (!supportFile) {
      setUploadError("Please choose a file to upload.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", supportFile);
      formData.append("uploaderEmail", userEmail);

      const res = await fetch(`${apiBase}/api/uploads`, {
        method: "POST",
        body: formData,
        headers: {
          ...authHeader(),
        },
      });

      if (!res.ok) {
        const message = await res.text();
        setUploadError(message || "Upload failed");
        return;
      }

      const data = await res.json();
      const newUpload: UploadedRecord = {
        ...data,
        created_at: new Date().toISOString(),
      };
      setUploads((prev) => [newUpload, ...prev]);
      onChange(newUpload);
      setShowUploadPicker(false);
      setSupportFile(null);
    } catch (err) {
      console.error("Upload failed", err);
      setUploadError("Failed to upload. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleSelectExisting(file: UploadedRecord) {
    onChange(file);
    setShowUploadPicker(false);
    setUploadError(null);
  }

  async function checkFileUsage(file: UploadedRecord) {
    setCheckingUsage(true);
    setUploadError(null);

    try {
      const res = await fetch(`${apiBase}/api/uploads/check-usage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ key: file.key }),
      });

      if (!res.ok) {
        const message = await res.text();
        setUploadError(message || "Failed to check file usage");
        return null;
      }

      const usage: FileUsage = await res.json();
      return usage;
    } catch (err) {
      console.error("Failed to check file usage", err);
      setUploadError("Failed to check file usage. Please try again.");
      return null;
    } finally {
      setCheckingUsage(false);
    }
  }

  async function initiateDelete(file: UploadedRecord) {
    setSelectedFileForDeletion(file);
    const usage = await checkFileUsage(file);
    
    if (usage) {
      setFileUsage(usage);
      setShowUsageModal(true);
    }
  }

  async function confirmDelete() {
    if (!selectedFileForDeletion || !fileUsage) {
      return;
    }

    if (!fileUsage.canDelete) {
      setUploadError("Cannot delete: file is used in approved documents");
      setShowUsageModal(false);
      return;
    }

    setDeleting(selectedFileForDeletion.key);
    setUploadError(null);
    setShowUsageModal(false);

    try {
      const res = await fetch(`${apiBase}/api/uploads`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ key: selectedFileForDeletion.key }),
      });

      if (!res.ok) {
        const message = await res.text();
        setUploadError(message || "Failed to delete file");
        return;
      }

      // Remove from local state
      setUploads((prev) => prev.filter((f) => f.key !== selectedFileForDeletion.key));

      // If the deleted file was the selected one, clear the selection
      if (value?.key === selectedFileForDeletion.key) {
        onChange(null);
      }

      setSelectedFileForDeletion(null);
      setFileUsage(null);
    } catch (err) {
      console.error("Delete failed", err);
      setUploadError("Failed to delete file. Please try again.");
    } finally {
      setDeleting(null);
    }
  }

  function cancelDelete() {
    setShowUsageModal(false);
    setSelectedFileForDeletion(null);
    setFileUsage(null);
    setUploadError(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          onClick={openUploadPicker}
        >
          {buttonLabel}
        </button>
        {value && (
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800">
              <p className="font-semibold">Selected file</p>
              <p className="text-slate-600">
                <a
                  href={value.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-900 underline"
                >
                  {value.original_name || value.key}
                </a>{" "}
                ({(value.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            </div>
            <button
              type="button"
              className="rounded-md border border-red-600 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => initiateDelete(value)}
              disabled={deleting === value.key || checkingUsage}
            >
              {deleting === value.key ? "Deleting..." : checkingUsage ? "Checking..." : "Delete"}
            </button>
          </div>
        )}
      </div>
      {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

      {showUploadPicker && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70">
          <div className="relative w-full max-w-4xl max-h-[85vh] overflow-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Uploads</p>
                <h3 className="text-xl font-semibold text-slate-900">Select or upload a file</h3>
              </div>
              <button
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={closeUploadPicker}
              >
                Close
              </button>
            </div>

            <div className="grid h-full gap-0 md:grid-cols-3">
              <div className="md:col-span-2 border-slate-200 md:border-r">
                <div className="h-full overflow-y-auto p-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">Your uploads</p>
                    <button
                      className="text-xs font-medium text-slate-600 underline"
                      onClick={loadUploads}
                      type="button"
                    >
                      Refresh
                    </button>
                  </div>
                  {uploadsLoading && <p className="mt-3 text-sm text-slate-600">Loading uploads...</p>}
                  {uploadsError && <p className="mt-3 text-sm text-red-600">{uploadsError}</p>}
                  {!uploadsLoading && !uploads.length && !uploadsError && (
                    <p className="mt-3 text-sm text-slate-600">No uploads yet.</p>
                  )}
                  <div className="mt-4 space-y-3">
                    {uploads.map((file) => (
                      <div
                        key={file.key + (file.created_at || "")}
                        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-3"
                      >
                        <div className="text-sm text-slate-800">
                          <p className="font-semibold">{file.original_name || file.key}</p>
                          <p className="text-slate-600">
                            {(file.size / 1024 / 1024).toFixed(2)} MB · {file.mimetype}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="rounded-md border border-red-600 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            onClick={() => initiateDelete(file)}
                            type="button"
                            disabled={deleting === file.key || checkingUsage}
                          >
                            {deleting === file.key ? "Deleting..." : checkingUsage ? "Checking..." : "Delete"}
                          </button>
                          <button
                            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                            onClick={() => handleSelectExisting(file)}
                            type="button"
                          >
                            Use this file
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex h-full flex-col gap-3 p-6">
                <p className="text-sm font-semibold text-slate-800">Upload new file</p>
                <p className="text-xs text-slate-600">Allowed: PDF, DOC/DOCX, MP4, PNG, JPG, TXT up to 10MB.</p>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.mp4,.png,.jpg,.jpeg,.txt"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  onChange={(e) => setSupportFile(e.target.files?.[0] || null)}
                />
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={handleSupportUpload}
                  disabled={uploading || !supportFile}
                >
                  {uploading ? "Uploading..." : "Upload new file"}
                </button>
                {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {showUsageModal && fileUsage && selectedFileForDeletion && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/70">
          <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-xl font-semibold text-slate-900">Delete File?</h3>
              <p className="text-sm text-slate-600 mt-1">
                {selectedFileForDeletion.original_name || selectedFileForDeletion.key}
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-slate-800">File Usage Summary</p>
                  <p className="text-2xl font-bold text-slate-900">{fileUsage.totalUsages}</p>
                </div>
                <p className="text-xs text-slate-600">
                  This file is currently used in {fileUsage.totalUsages} {fileUsage.totalUsages === 1 ? "place" : "places"} across the system.
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Usage by Status:</p>
                <div className="grid grid-cols-2 gap-2">
                  {fileUsage.usageByStatus.draft > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-xs text-slate-600">Draft</p>
                      <p className="text-lg font-semibold text-slate-900">{fileUsage.usageByStatus.draft}</p>
                    </div>
                  )}
                  {fileUsage.usageByStatus.submitted > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-xs text-slate-600">Submitted</p>
                      <p className="text-lg font-semibold text-blue-600">{fileUsage.usageByStatus.submitted}</p>
                    </div>
                  )}
                  {fileUsage.usageByStatus["in-review"] > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-xs text-slate-600">In Review</p>
                      <p className="text-lg font-semibold text-yellow-600">{fileUsage.usageByStatus["in-review"]}</p>
                    </div>
                  )}
                  {fileUsage.usageByStatus.approved > 0 && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                      <p className="text-xs text-rose-600">Approved</p>
                      <p className="text-lg font-semibold text-rose-700">{fileUsage.usageByStatus.approved}</p>
                    </div>
                  )}
                  {fileUsage.usageByStatus.rejected > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="text-xs text-slate-600">Rejected</p>
                      <p className="text-lg font-semibold text-slate-700">{fileUsage.usageByStatus.rejected}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-slate-800">Usage by Type:</p>
                <div className="space-y-1 text-sm">
                  {fileUsage.details.inRequests > 0 && (
                    <p className="text-slate-700">• {fileUsage.details.inRequests} request{fileUsage.details.inRequests !== 1 ? "s" : ""}</p>
                  )}
                  {fileUsage.details.inChatFiles > 0 && (
                    <p className="text-slate-700">• {fileUsage.details.inChatFiles} chat attachment{fileUsage.details.inChatFiles !== 1 ? "s" : ""}</p>
                  )}
                  {fileUsage.details.inPostApproval > 0 && (
                    <p className="text-slate-700">• {fileUsage.details.inPostApproval} post-approval submission{fileUsage.details.inPostApproval !== 1 ? "s" : ""}</p>
                  )}
                </div>
              </div>

              {fileUsage.hasApprovedUsage && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                  <p className="text-sm font-semibold text-rose-800 mb-1">⚠️ Cannot Delete</p>
                  <p className="text-sm text-rose-700">
                    This file is used in {fileUsage.usageByStatus.approved} approved document{fileUsage.usageByStatus.approved !== 1 ? "s" : ""}. 
                    Files used in approved documents cannot be deleted to maintain document integrity.
                  </p>
                </div>
              )}

              {!fileUsage.hasApprovedUsage && fileUsage.totalUsages > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">⚠️ Warning</p>
                  <p className="text-sm text-yellow-700">
                    Deleting this file will affect {fileUsage.totalUsages} {fileUsage.totalUsages === 1 ? "area" : "areas"}. 
                    This action cannot be undone.
                  </p>
                </div>
              )}

              {!fileUsage.hasApprovedUsage && fileUsage.totalUsages === 0 && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                  <p className="text-sm font-semibold text-green-800 mb-1">✓ Safe to Delete</p>
                  <p className="text-sm text-green-700">
                    This file is not currently being used anywhere. It's safe to delete.
                  </p>
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={cancelDelete}
                type="button"
              >
                Cancel
              </button>
              {fileUsage.canDelete && (
                <button
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={confirmDelete}
                  type="button"
                  disabled={deleting === selectedFileForDeletion.key}
                >
                  {deleting === selectedFileForDeletion.key ? "Deleting..." : "Delete File"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
