"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, readAuth } from "../../../lib/authStorage";

type UserRow = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  created_at?: string;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState(readAuth());
  const [mounted, setMounted] = useState(false);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [edits, setEdits] = useState<Record<number, Partial<UserRow>>>({});
  const [passwords, setPasswords] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingDetails, setSavingDetails] = useState<Record<number, boolean>>({});
  const [savingRole, setSavingRole] = useState<Record<number, boolean>>({});
  const [savingPassword, setSavingPassword] = useState<Record<number, boolean>>({});
  const [editModalId, setEditModalId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<UserRow> & { password?: string }>({});
  const [creating, setCreating] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{ name: string; email: string; phone: string; role: string; password: string }>(
    { name: "", email: "", phone: "", role: "USER", password: "" }
  );
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

  useEffect(() => {
    if (mounted && auth?.token) {
      loadUsers();
    }
  }, [mounted, auth?.token]);

  function authHeaders() {
    return {
      Authorization: auth?.token ? `Bearer ${auth.token}` : "",
      "Content-Type": "application/json",
    };
  }

  async function loadUsers() {
    if (!auth?.token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/users/admin`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to load users");
      }
      const data: UserRow[] = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
        const initialEdits: Record<number, Partial<UserRow>> = {};
        data.forEach((u: UserRow) => {
          initialEdits[u.id] = { name: u.name, email: u.email, phone: u.phone };
        });
        setEdits(initialEdits);
      } else {
        setUsers([]);
        setEdits({});
      }
    } catch (err) {
      console.error("Failed to load users", err);
      setError("Unable to load users");
    } finally {
      setLoading(false);
    }
  }

  function updateEdit(id: number, field: keyof UserRow, value: string) {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function saveDetails(id: number) {
    if (!auth?.token || !edits[id]) return;
    setSavingDetails((prev) => ({ ...prev, [id]: true }));
    setError(null);
    try {
      const body = {
        name: edits[id].name,
        email: edits[id].email,
        phone: edits[id].phone,
      };
      const res = await fetch(`${apiBase}/api/users/admin/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to update user");
      }
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      setEdits((prev) => ({ ...prev, [id]: { name: updated.name, email: updated.email, phone: updated.phone } }));
    } catch (err) {
      console.error("Failed to save details", err);
      setError("Unable to update user details");
    } finally {
      setSavingDetails((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function saveRole(id: number, role: string) {
    if (!auth?.token) return;
    setSavingRole((prev) => ({ ...prev, [id]: true }));
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/users/admin/${id}/role`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to change role");
      }
      const updated = await res.json();
      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    } catch (err) {
      console.error("Failed to change role", err);
      setError("Unable to change role");
    } finally {
      setSavingRole((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function savePassword(id: number) {
    if (!auth?.token) return;
    const pwd = passwords[id];
    if (!pwd || pwd.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setSavingPassword((prev) => ({ ...prev, [id]: true }));
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/users/admin/${id}/password`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ newPassword: pwd }),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to update password");
      }
      setPasswords((prev) => ({ ...prev, [id]: "" }));
    } catch (err) {
      console.error("Failed to update password", err);
      setError("Unable to update password");
    } finally {
      setSavingPassword((prev) => ({ ...prev, [id]: false }));
    }
  }

  function openEdit(user: UserRow) {
    setEditModalId(user.id);
    setEditForm({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role,
      password: "",
    });
  }

  function closeEdit() {
    setEditModalId(null);
    setEditForm({});
  }

  async function saveEdit() {
    if (!editModalId || !auth?.token) return;
    const id = editModalId;
    const payload = { name: editForm.name, email: editForm.email, phone: editForm.phone };
    setSavingDetails((prev) => ({ ...prev, [id]: true }));
    setSavingRole((prev) => ({ ...prev, [id]: true }));
    setSavingPassword((prev) => ({ ...prev, [id]: !!editForm.password }));
    setError(null);
    try {
      // update details
      const resDetails = await fetch(`${apiBase}/api/users/admin/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!resDetails.ok) {
        const message = await resDetails.text();
        throw new Error(message || "Failed to update user");
      }
      let updated: UserRow = await resDetails.json();

      // update role if changed
      if (editForm.role && editForm.role !== updated.role) {
        const resRole = await fetch(`${apiBase}/api/users/admin/${id}/role`, {
          method: "PATCH",
          headers: authHeaders(),
          body: JSON.stringify({ role: editForm.role }),
        });
        if (!resRole.ok) {
          const message = await resRole.text();
          throw new Error(message || "Failed to change role");
        }
        updated = await resRole.json();
      }

      // update password if provided
      if (editForm.password && editForm.password.length >= 6) {
        const resPwd = await fetch(`${apiBase}/api/users/admin/${id}/password`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ newPassword: editForm.password }),
        });
        if (!resPwd.ok) {
          const message = await resPwd.text();
          throw new Error(message || "Failed to update password");
        }
      }

      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
      setEdits((prev) => ({ ...prev, [id]: { name: updated.name, email: updated.email, phone: updated.phone } }));
      closeEdit();
    } catch (err) {
      console.error("Failed to save edit", err);
      setError("Unable to save changes");
    } finally {
      setSavingDetails((prev) => ({ ...prev, [id]: false }));
      setSavingRole((prev) => ({ ...prev, [id]: false }));
      setSavingPassword((prev) => ({ ...prev, [id]: false }));
    }
  }

  async function createUser() {
    if (!auth?.token) return;
    if (!createForm.name || !createForm.email || !createForm.password) {
      setError("Name, email, and password are required");
      return;
    }
    if (createForm.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/users/admin`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(createForm),
      });
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Failed to create user");
      }
      const created: UserRow = await res.json();
      setUsers((prev) => [created, ...prev]);
      setEdits((prev) => ({ ...prev, [created.id]: { name: created.name, email: created.email, phone: created.phone } }));
      setCreateForm({ name: "", email: "", phone: "", role: "USER", password: "" });
      setCreateModalOpen(false);
    } catch (err) {
      console.error("Failed to create user", err);
      setError("Unable to create user");
    } finally {
      setCreating(false);
    }
  }

  function handleSignOut() {
    clearAuth();
    router.replace("/signin");
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

        <section className="flex-1 px-5 py-10 sm:px-8 lg:px-12">
          <header className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Admin</p>
              <h1 className="text-3xl font-semibold">Users</h1>
              <p className="text-sm text-slate-600">Manage users, roles, and departments.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                onClick={loadUsers}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
              <button
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                onClick={() => setCreateModalOpen(true)}
              >
                Add user
              </button>
            </div>
          </header>
          {error && <p className="mb-3 text-sm text-rose-600">{error}</p>}

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            {loading && <p className="text-sm text-slate-600">Loading users...</p>}
            {!loading && !users.length && <p className="text-sm text-slate-600">No users found.</p>}

            <div className="hidden lg:block">
              <div className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] items-center gap-4 border-b border-slate-200 px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>Name</span>
                <span>Email</span>
                <span>Phone</span>
                <span>Role</span>
                <span>Actions</span>
              </div>
              <div className="divide-y divide-slate-200">
                {users.map((u) => (
                  <div key={u.id} className="grid grid-cols-[1.5fr_1.5fr_1fr_1fr_auto] items-center gap-4 px-2 py-3">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">ID: {u.id}</p>
                    </div>
                    <div className="text-sm text-slate-800">
                      <p>{u.email}</p>
                      {u.created_at && <p className="text-xs text-slate-500">Created: {new Date(u.created_at).toLocaleDateString()}</p>}
                    </div>
                    <p className="text-sm text-slate-800">{u.phone || "—"}</p>
                    <span className="text-xs font-semibold uppercase text-slate-600">{u.role}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white"
                        onClick={() => openEdit(u)}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 lg:hidden">
              {users.map((u) => (
                <div key={u.id} className="rounded-lg border border-slate-200 p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                    <span className="text-xs font-semibold uppercase text-slate-600">{u.role}</span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">
                    {u.phone && <p>Phone: {u.phone}</p>}
                    {u.created_at && <p>Created: {new Date(u.created_at).toLocaleDateString()}</p>}
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                      onClick={() => openEdit(u)}
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {editModalId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
              <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Edit user</p>
                    <p className="text-lg font-semibold text-slate-900">{editForm.email}</p>
                  </div>
                  <button
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={closeEdit}
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-3 px-4 py-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Name</label>
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.name || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Email</label>
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.email || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Phone</label>
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.phone || ""}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Role</label>
                      <select
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={editForm.role || "USER"}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                      >
                        <option value="USER">USER</option>
                        <option value="HOD">HOD</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">New password (optional)</label>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={editForm.password || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                      onClick={closeEdit}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      onClick={saveEdit}
                      disabled={!!savingDetails[editModalId] || !!savingRole[editModalId] || !!savingPassword[editModalId]}
                    >
                      {savingDetails[editModalId] || savingRole[editModalId] || savingPassword[editModalId] ? 'Saving...' : 'Save changes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {createModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
              <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Add user</p>
                    <p className="text-lg font-semibold text-slate-900">Create a new account</p>
                  </div>
                  <button
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => setCreateModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-3 px-4 py-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Name</label>
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={createForm.name}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Email</label>
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={createForm.email}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Phone</label>
                      <input
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={createForm.phone}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Role</label>
                      <select
                        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                        value={createForm.role}
                        onChange={(e) => setCreateForm((prev) => ({ ...prev, role: e.target.value }))}
                      >
                        <option value="USER">USER</option>
                        <option value="HOD">HOD</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Password</label>
                    <input
                      className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      type="password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
                      onClick={() => setCreateModalOpen(false)}
                      type="button"
                    >
                      Cancel
                    </button>
                    <button
                      className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                      onClick={createUser}
                      disabled={creating}
                    >
                      {creating ? 'Creating...' : 'Create user'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
