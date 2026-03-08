"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, readAuth } from "../../../lib/authStorage";

type Profile = {
  id?: number;
  name: string;
  phone: string;
  email: string;
  role: string;
  created_at?: string;
};

export default function UserProfilePage() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState(readAuth());
  const [mounted, setMounted] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "" });
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwdMessage, setPwdMessage] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSaving, setPwdSaving] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

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
    if (mounted && auth?.token) {
      loadProfile();
    }
  }, [mounted, auth?.token]);

  function handleSignOut() {
    clearAuth();
    router.replace("/signin");
  }

  async function loadProfile() {
    if (!auth?.token) return;
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const res = await fetch(`${apiBase}/api/users/me`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (res.status === 401) {
        clearAuth();
        router.replace("/signin");
        return;
      }
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load profile");
      }
      const data = await res.json();
      setProfile(data);
      setProfileForm({ name: data.name || "", phone: data.phone || "" });
    } catch (err) {
      console.error("Failed to load profile", err);
      setProfileError("Unable to load profile. Please try again.");
    } finally {
      setLoadingProfile(false);
    }
  }

  async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token) {
      setProfileError("Missing session. Please sign in again.");
      return;
    }

    const name = profileForm.name.trim();
    const phone = profileForm.phone.trim();

    if (!name || !phone) {
      setProfileError("Name and phone are required.");
      return;
    }

    setSavingProfile(true);
    setProfileError(null);
    setProfileMessage(null);

    try {
      const res = await fetch(`${apiBase}/api/users/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ name, phone }),
      });

      if (res.status === 401) {
        clearAuth();
        router.replace("/signin");
        return;
      }

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to update profile");
      }

      const data = await res.json();
      setProfile(data);
      setProfileMessage("Profile updated");
    } catch (err) {
      console.error("Failed to update profile", err);
      setProfileError("Could not update profile. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token) {
      setPwdError("Missing session. Please sign in again.");
      return;
    }

    const currentPassword = pwdForm.currentPassword.trim();
    const newPassword = pwdForm.newPassword.trim();
    const confirmPassword = pwdForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError("All password fields are required.");
      return;
    }

    if (newPassword.length < 6) {
      setPwdError("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError("New passwords do not match.");
      return;
    }

    setPwdSaving(true);
    setPwdError(null);
    setPwdMessage(null);

    try {
      const res = await fetch(`${apiBase}/api/users/password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.status === 401) {
        clearAuth();
        router.replace("/signin");
        return;
      }

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to reset password");
      }

      setPwdMessage("Password updated");
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      console.error("Failed to reset password", err);
      setPwdError("Could not reset password. Please try again.");
    } finally {
      setPwdSaving(false);
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
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Profile</p>
              <h1 className="text-3xl font-semibold">Account settings</h1>
              <p className="text-sm text-slate-600">Update your basic information and reset your password.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
              {auth.token && (
                <>
                  <span className="rounded-md bg-white px-3 py-2 shadow-sm">{auth.email || "(no email)"}</span>
                  <span className="rounded-md bg-white px-3 py-2 shadow-sm">{auth.role || "USER"}</span>
                  <button
                    className="rounded-md bg-slate-900 px-3 py-2 text-white transition hover:bg-slate-800"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </>
              )}
            </div>
          </header>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Basic information</p>
                    <p className="text-sm text-slate-600">Keep your contact details current.</p>
                  </div>
                  <button
                    className="text-sm font-medium text-slate-700 underline"
                    onClick={loadProfile}
                    disabled={loadingProfile}
                  >
                    {loadingProfile ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
                {profileError && (
                  <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {profileError}
                  </div>
                )}
                {profileMessage && (
                  <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {profileMessage}
                  </div>
                )}
                <form className="space-y-4" onSubmit={handleProfileSubmit}>
                  <label className="block text-sm font-medium text-slate-700">
                    Full name
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Phone
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Phone number"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Email
                    <input
                      className="mt-2 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base text-slate-600"
                      type="email"
                      value={profile?.email || auth.email || ""}
                      readOnly
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                      disabled={savingProfile}
                    >
                      {savingProfile ? "Saving…" : "Save changes"}
                    </button>
                    {profile && (
                      <span className="text-xs text-slate-500">Last loaded: {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}</span>
                    )}
                  </div>
                </form>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Reset password</p>
                  <p className="text-sm text-slate-600">Use your current password to set a new one.</p>
                </div>
                {pwdError && (
                  <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {pwdError}
                  </div>
                )}
                {pwdMessage && (
                  <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                    {pwdMessage}
                  </div>
                )}
                <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                  <label className="block text-sm font-medium text-slate-700">
                    Current password
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                      type="password"
                      value={pwdForm.currentPassword}
                      onChange={(e) => setPwdForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      placeholder="••••••"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    New password
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                      type="password"
                      value={pwdForm.newPassword}
                      onChange={(e) => setPwdForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="••••••"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Confirm new password
                    <input
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                      type="password"
                      value={pwdForm.confirmPassword}
                      onChange={(e) => setPwdForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="••••••"
                    />
                  </label>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    disabled={pwdSaving}
                  >
                    {pwdSaving ? "Updating…" : "Update password"}
                  </button>
                </form>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Account</p>
                <p className="text-sm text-slate-600">Your session details</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Email</p>
                <p>{profile?.email || auth.email || "—"}</p>
                <p className="mt-3 font-semibold text-slate-900">Role</p>
                <p>{profile?.role || auth.role || "USER"}</p>
                <p className="mt-3 font-semibold text-slate-900">Name</p>
                <p>{profile?.name || profileForm.name || "—"}</p>
                <p className="mt-3 font-semibold text-slate-900">Phone</p>
                <p>{profile?.phone || profileForm.phone || "—"}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-600">
                <p className="font-semibold text-slate-800">Tip</p>
                <p>Use a unique password and update contact info so approvers can reach you.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
