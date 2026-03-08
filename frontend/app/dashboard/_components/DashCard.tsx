"use client";

type DashCardProps = {
  title: string;
  description: string;
  message: string | null;
};

export function DashCard({ title, description, message }: DashCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        {message && <span className="text-xs font-medium text-slate-700">{message}</span>}
      </div>
    </div>
  );
}
