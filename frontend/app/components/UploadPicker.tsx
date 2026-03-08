"use client";

import { useState } from "react";

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

  async function loadUploads() {
    setUploadsLoading(true);
    setUploadsError(null);
    try {
      const res = await fetch(`${apiBase}/api/uploads?email=${encodeURIComponent(userEmail)}`, {
        headers: {
          "x-user-email": userEmail,
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
          "x-user-email": userEmail,
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
                        <button
                          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          onClick={() => handleSelectExisting(file)}
                          type="button"
                        >
                          Use this file
                        </button>
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
    </div>
  );
}
