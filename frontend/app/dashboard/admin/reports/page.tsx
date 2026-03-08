"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, readAuth } from "../../../lib/authStorage";

export default function AdminReportsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState(readAuth());
  const [mounted, setMounted] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

  const navItems = useMemo(
    () => [
      { label: "Overview", href: "/dashboard/admin" },
      { label: "Requests", href: "/dashboard/admin/requests" },
      { label: "Users", href: "/dashboard/admin/users" },
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

  function handleSignOut() {
    clearAuth();
    router.replace("/signin");
  }

  async function downloadReport(kind: "requests" | "users") {
    if (!auth?.token) return;
    setDownloading(kind);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/reports/${kind}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to download report");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${kind}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download report", err);
      setError("Unable to download report");
    } finally {
      setDownloading(null);
    }
  }

  async function downloadRequestsExcel() {
    if (!auth?.token) return;
    setDownloading("requests-xlsx");
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/reports/requests.xlsx`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to download Excel");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "requests.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download Excel", err);
      setError("Unable to download Excel report");
    } finally {
      setDownloading(null);
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
                  <span className={"h-2 w-2 rounded-full " + (active ? "bg-slate-500" : "bg-slate-300")} aria-hidden="true" />
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
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Admin</p>
              <h1 className="text-3xl font-semibold">Reports</h1>
              <p className="text-sm text-slate-600">Download CSV exports for auditing.</p>
            </div>
          </header>

          {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-lg font-semibold text-slate-900">Requests CSV</p>
              <p className="text-sm text-slate-600">All requests with status and owner.</p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={() => downloadReport("requests")}
                  disabled={downloading === "requests"}
                >
                  {downloading === "requests" ? "Downloading..." : "Download requests"}
                </button>
                <button
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-200"
                  onClick={downloadRequestsExcel}
                  disabled={downloading === "requests-xlsx"}
                >
                  {downloading === "requests-xlsx" ? "Preparing..." : "Download Excel"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-lg font-semibold text-slate-900">Users CSV</p>
              <p className="text-sm text-slate-600">All users with roles and contact.</p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={() => downloadReport("users")}
                  disabled={downloading === "users"}
                >
                  {downloading === "users" ? "Downloading..." : "Download users"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
