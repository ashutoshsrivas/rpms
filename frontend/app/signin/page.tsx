"use client";

import Link from "next/link";
import AuthForm from "../components/AuthForm";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-semibold text-white">GEU</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-slate-400">Sign in to Graphic Era University's research management system</p>
        </div>

        {/* Sign In Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
          <AuthForm mode="login" redirectTo="/dashboard" />
          
          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10"></div>
            <span className="text-xs font-medium text-slate-400">OR</span>
            <div className="h-px flex-1 bg-white/10"></div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-sm text-slate-400">
              New to GEU?{" "}
              <Link href="/signup" className="font-semibold text-white hover:text-slate-200 transition">
                Create an account
              </Link>
            </p>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center text-xs text-slate-400">
          <p>Use your institutional email and password to sign in</p>
        </div>
      </div>
    </main>
  );
}
