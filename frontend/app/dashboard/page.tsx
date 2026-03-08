"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { readAuth } from "../lib/authStorage";

export default function DashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = readAuth();
    if (stored.role === "ADMIN") {
      router.replace("/dashboard/admin");
    } else if (stored.role === "HOD") {
      router.replace("/dashboard/hod");
    } else if (stored.role === "USER") {
      router.replace("/dashboard/user");
    } else {
      router.replace("/signin");
    }
    setMounted(true);
  }, [router]);

  if (!mounted) {
    return null;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-4 bg-white px-6 py-16 text-slate-900">
      <p className="text-sm text-slate-600">Redirecting you to your dashboard…</p>
      <Link className="text-slate-900 underline" href="/signin">
        Go to sign in
      </Link>
    </main>
  );
}

