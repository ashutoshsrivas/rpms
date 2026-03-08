"use client";

import Link from "next/link";
import AuthForm from "./components/AuthForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-200/50 bg-white/80 sticky top-0 z-50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-lg font-semibold">GEU</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/signup" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div>
            <p className="text-sm font-semibold text-blue-600 mb-3 uppercase tracking-wide">Graphic Era University</p>
            <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
              Manage Your Research & Funding Requests
            </h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
              Streamline your research proposals, conference submissions, and funding applications. Track approvals, manage documents, and accelerate your research initiatives.
            </p>
            
            {/* Features List */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 flex-shrink-0 mt-0.5">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Multiple Grant Types</p>
                  <p className="text-sm text-slate-600">Research projects, conferences, FDP, workshops, and more</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 flex-shrink-0 mt-0.5">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Easy Tracking</p>
                  <p className="text-sm text-slate-600">Monitor approvals and status in real-time</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 flex-shrink-0 mt-0.5">
                  <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Secure Upload</p>
                  <p className="text-sm text-slate-600">Safely store and manage your documents</p>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link 
                href="#signin" 
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 text-white px-6 py-3 font-semibold hover:bg-slate-800 transition"
              >
                Sign in now
              </Link>
              <Link 
                href="/signup" 
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 text-slate-900 px-6 py-3 font-semibold hover:bg-slate-50 transition"
              >
                Create account
              </Link>
            </div>
          </div>

          {/* Right Section - Sign In Card */}
          <div className="lg:pl-6">
            <div id="signin" className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome back</h2>
              <p className="text-slate-600 mb-6">Sign in to your account to continue</p>
              <AuthForm mode="login" theme="light" />
              <div className="mt-6 pt-6 border-t border-slate-200 text-center">
                <p className="text-sm text-slate-600">
                  Don't have an account?{" "}
                  <Link href="/signup" className="font-semibold text-slate-900 hover:text-slate-700">
                    Create one
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200/50 bg-slate-50/50 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-slate-600">
          <p>© 2026 Graphic Era University. Simplifying research management.</p>
        </div>
      </div>
    </main>
  );
}
