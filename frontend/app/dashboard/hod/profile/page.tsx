"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, readAuth } from "../../../lib/authStorage";

const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

type Profile = { name: string; phone: string; email: string; role: string };

type Prefs = { draftSubmitted: boolean; adminDecision: boolean };

export default function HodProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState(readAuth());
  const [mounted, setMounted] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>({ draftSubmitted: true, adminDecision: true });
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" });

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

    // Seed form so it is not blank while API loads
    setProfile({
      name: "",
      phone: "",
      email: stored.email || "",
      role: stored.role || "HOD",
    });

    // Load notification preferences
    const raw = typeof window !== "undefined" ? window.localStorage.getItem("hod-notify-prefs") : null;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setPrefs((prev) => ({ ...prev, ...parsed } as Prefs));
      } catch (err) {
        // ignore malformed data
      }
    }

    setMounted(true);
    if (stored.token) {
      loadProfile(stored.token);
    } else {
      setProfileError("Missing session. Please sign in again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function persistPrefs(next: Prefs) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("hod-notify-prefs", JSON.stringify(next));
    }
  }

  function togglePref(key: keyof Prefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    persistPrefs(next);
    setMessage("Preferences updated");
    setTimeout(() => setMessage(null), 2000);
  }

  function handleSignOut() {
    clearAuth();
    router.replace("/signin");
  }

  async function loadProfile(token: string) {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await fetch(`${apiBase}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load profile");
      }
      const data = await res.json();
      setProfile({
        name: data.name || "",
        phone: data.phone || "",
        email: data.email || auth.email || "",
        role: data.role || auth.role || "HOD",
      });
    } catch (err) {
      console.error("Failed to load profile", err);
      setProfileError("Unable to load profile");
    } finally {
      setProfileLoading(false);
    }
  }

  function handleProfileUpdate() {
    if (!auth.token || !profile) return;
    if (!profile.name.trim() || !profile.phone.trim()) {
      setMessage("Name and phone are required");
      setTimeout(() => setMessage(null), 2500);
      return;
    }
    setSaveLoading(true);
    setProfileError(null);
    fetch(`${apiBase}/api/users/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ name: profile.name.trim(), phone: profile.phone.trim() }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to save profile");
        }
        return res.json();
      })
      .then((data) => {
        setProfile((prev) =>
          prev ? { ...prev, name: data.name || prev.name, phone: data.phone || prev.phone } : prev
        );
        setMessage("Profile updated");
        setTimeout(() => setMessage(null), 2500);
      })
      .catch((err) => {
        console.error("Failed to update profile", err);
        setProfileError("Unable to save profile");
      })
      .finally(() => setSaveLoading(false));
  }

  function handlePasswordChange() {
    if (!auth.token) return;
    if (!passwordForm.current || !passwordForm.next || !passwordForm.confirm) {
      setPasswordError("Fill current, new, and confirm password.");
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("New password and confirm do not match.");
      return;
    }
    if (passwordForm.next.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    fetch(`${apiBase}/api/users/password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${auth.token}`,
      },
      body: JSON.stringify({ currentPassword: passwordForm.current, newPassword: passwordForm.next }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to change password");
        }
        return res.json();
      })
      .then(() => {
        setMessage("Password updated successfully");
        setPasswordForm({ current: "", next: "", confirm: "" });
        setTimeout(() => setMessage(null), 2500);
      })
      .catch((err) => {
        console.error("Failed to change password", err);
        setPasswordError("Unable to change password. Check current password.");
      })
      .finally(() => setPasswordLoading(false));
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
          <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">HOD</p>
              <h1 className="text-3xl font-semibold">Profile</h1>
              <p className="text-sm text-slate-600">Manage your account and preferences.</p>
            </div>
            {auth.token && profile && (
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                <span className="rounded-md bg-white px-3 py-2 shadow-sm">{profile.email || "(no email)"}</span>
                <span className="rounded-md bg-white px-3 py-2 shadow-sm">{profile.role || "USER"}</span>
              </div>
            )}
          </header>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Account</p>
              {profileError && <p className="mt-2 text-sm text-rose-600">{profileError}</p>}
              {profileLoading && <p className="mt-2 text-sm text-slate-600">Loading profile...</p>}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{profile?.email || "—"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Role</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{profile?.role || "—"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Name</p>
                  <input
                    type="text"
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    placeholder="Enter name"
                    value={profile?.name || ""}
                    onChange={(e) => profile && setProfile({ ...profile, name: e.target.value })}
                  />
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Phone</p>
                  <input
                    type="tel"
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-400 focus:outline-none"
                    placeholder="Enter phone"
                    value={profile?.phone || ""}
                    onChange={(e) => profile && setProfile({ ...profile, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <button
                  className="rounded-md border border-slate-300 px-3 py-2 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-200"
                  onClick={handleProfileUpdate}
                  disabled={saveLoading || profileLoading}
                >
                  {saveLoading ? "Saving..." : "Update profile"}
                </button>
              </div>
              {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
              {passwordError && <p className="mt-3 text-sm text-rose-600">{passwordError}</p>}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-semibold text-slate-900">Notifications</p>
              <p className="mt-2 text-sm text-slate-600">Configure reminders for drafts, submissions, and admin decisions.</p>
              <div className="mt-4 space-y-3 text-sm">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={prefs.draftSubmitted}
                    onChange={() => togglePref("draftSubmitted")}
                  />
                  <span>Notify me when a draft is submitted</span>
                </label>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={prefs.adminDecision}
                    onChange={() => togglePref("adminDecision")}
                  />
                  <span>Notify me when Admin approves/rejects</span>
                </label>
              </div>

              <div className="mt-6 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Change password</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <input
                    type="password"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Current password"
                    value={passwordForm.current}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                  />
                  <input
                    type="password"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="New password"
                    value={passwordForm.next}
                    onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                  />
                  <input
                    type="password"
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Confirm new password"
                    value={passwordForm.confirm}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  />
                </div>
                <button
                  className="mt-3 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  onClick={handlePasswordChange}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? "Updating..." : "Update password"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
