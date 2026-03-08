"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuth, readAuth, writeAuth, StoredAuth } from "../lib/authStorage";

type AuthMode = "login" | "signup";
type ThemeType = "light" | "dark";

type Props = {
  mode: AuthMode;
  redirectTo?: string;
  theme?: ThemeType;
};

function roleRedirectPath(role?: string | null) {
  if (role === "ADMIN") return "/dashboard/admin";
  if (role === "HOD") return "/dashboard/hod";
  return "/dashboard/user";
}

export default function AuthForm({ mode, redirectTo, theme = "dark" }: Props) {
  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000",
    []
  );
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<StoredAuth>(() => readAuth());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setExisting(readAuth());
    setMounted(true);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedEmail || !password.trim()) {
      setError("Email and password are required");
      return;
    }

    if (mode === "signup") {
      if (!trimmedName || !trimmedPhone) {
        setError("Name and phone are required");
        return;
      }
      if (!confirmPassword.trim()) {
        setError("Please retype your password");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

    const payload =
      mode === "login"
        ? { email: trimmedEmail, password }
        : { name: trimmedName, email: trimmedEmail, phone: trimmedPhone, password };

    try {
      const res = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.message || (mode === "login" ? "Login failed" : "Signup failed"));
        return;
      }

      const role = data.user?.role ?? "USER";
      writeAuth(data.token, data.user?.email ?? trimmedEmail, role);
      setMessage(mode === "login" ? "Signed in" : "Account created");
      setPassword("");
      setConfirmPassword("");
      const target = redirectTo || roleRedirectPath(role);
      router.push(target);
    } catch (err) {
      setError("Unable to authenticate");
    }
  }

  function handleLogout() {
    clearAuth();
    setMessage("Signed out");
  }

  return (
    <div>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {mode === "signup" && (
          <label className={`text-sm font-medium ${theme === "dark" ? "text-white/90" : "text-slate-700"}`}>
            Full name
            <input
              className={`mt-2 w-full rounded-lg border px-3 py-2.5 focus:outline-none transition ${
                theme === "dark"
                  ? "border-white/10 bg-white/5 backdrop-blur text-white placeholder-white/40 focus:border-white/30 focus:bg-white/10"
                  : "border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:bg-white"
              }`}
              placeholder="Your name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        <label className={`text-sm font-medium ${theme === "dark" ? "text-white/90" : "text-slate-700"}`}>
          Email
          <input
            className={`mt-2 w-full rounded-lg border px-3 py-2.5 focus:outline-none transition ${
              theme === "dark"
                ? "border-white/10 bg-white/5 backdrop-blur text-white placeholder-white/40 focus:border-white/30 focus:bg-white/10"
                : "border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:bg-white"
            }`}
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        {mode === "signup" && (
          <label className={`text-sm font-medium ${theme === "dark" ? "text-white/90" : "text-slate-700"}`}>
            Phone
            <input
              className={`mt-2 w-full rounded-lg border px-3 py-2.5 focus:outline-none transition ${
                theme === "dark"
                  ? "border-white/10 bg-white/5 backdrop-blur text-white placeholder-white/40 focus:border-white/30 focus:bg-white/10"
                  : "border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:bg-white"
              }`}
              placeholder="+1 555 555 5555"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
        )}
        <label className={`text-sm font-medium ${theme === "dark" ? "text-white/90" : "text-slate-700"}`}>
          Password
          <input
            className={`mt-2 w-full rounded-lg border px-3 py-2.5 focus:outline-none transition ${
              theme === "dark"
                ? "border-white/10 bg-white/5 backdrop-blur text-white placeholder-white/40 focus:border-white/30 focus:bg-white/10"
                : "border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:bg-white"
            }`}
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {mode === "signup" && (
          <label className={`text-sm font-medium ${theme === "dark" ? "text-white/90" : "text-slate-700"}`}>
            Confirm password
            <input
              className={`mt-2 w-full rounded-lg border px-3 py-2.5 focus:outline-none transition ${
                theme === "dark"
                  ? "border-white/10 bg-white/5 backdrop-blur text-white placeholder-white/40 focus:border-white/30 focus:bg-white/10"
                  : "border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:bg-white"
              }`}
              placeholder="••••••••"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
        )}
        <button
          type="submit"
          className={`mt-2 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            theme === "dark"
              ? "bg-white text-slate-900 hover:bg-slate-100"
              : "bg-slate-900 text-white hover:bg-slate-800"
          }`}
        >
          {mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
      {error && (
        <div className={`mt-4 rounded-lg border p-3 ${
          theme === "dark"
            ? "bg-red-500/20 border-red-500/50"
            : "bg-red-50 border-red-200"
        }`}>
          <p className={`text-sm ${theme === "dark" ? "text-red-200" : "text-red-800"}`}>{error}</p>
        </div>
      )}
      {message && (
        <div className={`mt-4 rounded-lg border p-3 ${
          theme === "dark"
            ? "bg-emerald-500/20 border-emerald-500/50"
            : "bg-emerald-50 border-emerald-200"
        }`}>
          <p className={`text-sm ${theme === "dark" ? "text-emerald-200" : "text-emerald-800"}`}>{message}</p>
        </div>
      )}
    </div>
  );
}
