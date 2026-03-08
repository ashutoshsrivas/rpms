"use client";

import Link from "next/link";
import AuthForm from "../components/AuthForm";

export default function SignUpPage() {
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
          <h1 className="text-3xl font-bold text-white mb-2">Get started</h1>
          <p className="text-slate-400">Create your GEU account and start managing your research projects</p>
        </div>

        {/* Sign Up Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
          <AuthForm mode="signup" redirectTo="/dashboard" />
          
          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10"></div>
            <span className="text-xs font-medium text-slate-400">OR</span>
            <div className="h-px flex-1 bg-white/10"></div>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-sm text-slate-400">
              Already have a GEU account?{" "}
              <Link href="/" className="font-semibold text-white hover:text-slate-200 transition">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Features List */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 mb-2">
              <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-xs font-medium text-slate-300">Fast Setup</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 mb-2">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <p className="text-xs font-medium text-slate-300">Secure</p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-lg bg-white/10 mb-2">
              <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-xs font-medium text-slate-300">Easy to Use</p>
          </div>
        </div>
      </div>
    </main>
  );
}
