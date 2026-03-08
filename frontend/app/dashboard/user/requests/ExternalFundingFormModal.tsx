"use client";

import UploadPicker, { UploadedRecord } from "../../../components/UploadPicker";
import { ExternalFormState } from "./externalFormState";

type Props = {
  open: boolean;
  onClose: () => void;
  form: ExternalFormState;
  updateField: <K extends keyof ExternalFormState>(key: K, value: ExternalFormState[K]) => void;
  handleSaveDraft: () => void;
  saving: boolean;
  saveError: string | null;
  saveSuccess: string | null;
  approvers: { id: number; name: string; email: string; role: string }[];
  approversLoading: boolean;
  approversError: string | null;
  authEmail?: string;
  apiBase: string;
};

function toUploadRef(file: UploadedRecord | null) {
  if (!file) return null;
  return { key: file.key, url: file.url, original_name: file.original_name };
}

export default function ExternalFundingFormModal({
  open,
  onClose,
  form,
  updateField,
  handleSaveDraft,
  saving,
  saveError,
  saveSuccess,
  approvers,
  approversLoading,
  approversError,
  authEmail,
  apiBase,
}: Props) {
  if (!open) return null;

  const status = form.projectStatus?.toLowerCase();
  const isCompleted = status === "completed";
  const isWip = status === "work in progress";
  const isSanctioned = status === "sanctioned but yet to start";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
      <div className="relative h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">External funding</p>
            <h2 className="text-2xl font-semibold text-slate-900">External funding application</h2>
            <p className="text-sm text-slate-600">Provide sanction details, status, and required uploads.</p>
          </div>
          <button className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">1. Investigator Details</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {[{ label: "Name", key: "name" }, { label: "Name of Principal Investigator (PI)", key: "piName" }, { label: "Name of Co-Principal Investigator (Co-PI)", key: "coPiName" }, { label: "Designation", key: "designation" }, { label: "Email ID", key: "email", type: "email" }, { label: "Contact Number", key: "contact" }].map((item) => (
                <label key={item.key} className="text-sm font-medium text-slate-700">
                  {item.label}
                  <input
                    type={(item as any).type || "text"}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                    value={(form as any)[item.key]}
                    onChange={(e) => updateField(item.key as keyof ExternalFormState, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">2. Project Identification</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Title of Research Project
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                value={form.projectTitle}
                onChange={(e) => updateField("projectTitle", e.target.value)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">3. Type of External Project</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {["Sponsored Research", "Consultancy", "Collaborative / Joint Research", "Fellowship / Grant"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="projectTypeChoice"
                    className="h-4 w-4 border-slate-300"
                    checked={form.projectTypeChoice === opt}
                    onChange={() => updateField("projectTypeChoice", opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">4. Project Sanction Details</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Project Sanctioned Academic Year
                <select
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.academicYear}
                  onChange={(e) => updateField("academicYear", e.target.value)}
                >
                  <option value="">Select</option>
                  {["2020-2021", "2021-2022", "2022-2023", "2023-2024", "2024-2025", "2025-2026"].map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Type of Project (if applicable)
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.projectTypeText}
                  onChange={(e) => updateField("projectTypeText", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">5. Funding Agency Details</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Name of the External Funding Agency
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.fundingAgency}
                  onChange={(e) => updateField("fundingAgency", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Funding Agency Category
                <select
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.fundingAgencyCategory}
                  onChange={(e) => updateField("fundingAgencyCategory", e.target.value)}
                >
                  <option value="">Select</option>
                  {["Government (Central)", "Government (State)", "Industry", "International", "NGO / Foundation"].map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">6. Project Status</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {["Completed", "Work in Progress", "Sanctioned but Yet to Start"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="radio"
                    name="projectStatus"
                    className="h-4 w-4 border-slate-300"
                    checked={form.projectStatus === opt}
                    onChange={() => updateField("projectStatus", opt)}
                  />
                  {opt}
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">7. Declaration</h3>
                <p className="mt-1 text-sm text-slate-700">“I hereby declare that the information provided above is true and correct to the best of my knowledge.”</p>
              </div>
              <label className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={form.declarationAgreed}
                  onChange={(e) => updateField("declarationAgreed", e.target.checked)}
                />
                Agree
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">8. Mandatory Upload: Sanction Letter</h3>
            <UploadPicker
              apiBase={apiBase}
              userEmail={authEmail || ""}
              value={form.sanctionLetter as any}
              onChange={(file) => updateField("sanctionLetter", toUploadRef(file) as any)}
              buttonLabel="Upload sanction letter (PDF)"
            />
          </section>

          {isCompleted && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-900">Completion Details (Completed)</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <label className="text-sm font-medium text-slate-700">
                  Project Completion Year
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                    value={form.completionYear}
                    onChange={(e) => updateField("completionYear", e.target.value)}
                  />
                </label>
                <UploadPicker
                  apiBase={apiBase}
                  userEmail={authEmail || ""}
                  value={form.releaseOrder as any}
                  onChange={(file) => updateField("releaseOrder", toUploadRef(file) as any)}
                  buttonLabel="Upload Release Order"
                />
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {["progressReport1", "progressReport2", "progressReport3", "progressReport4"].map((key, idx) => (
                  <UploadPicker
                    key={key}
                    apiBase={apiBase}
                    userEmail={authEmail || ""}
                    value={(form as any)[key]}
                    onChange={(file) => updateField(key as keyof ExternalFormState, toUploadRef(file) as any)}
                    buttonLabel={`Upload Progress Report ${idx + 1}`}
                  />
                ))}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <UploadPicker
                  apiBase={apiBase}
                  userEmail={authEmail || ""}
                  value={form.finalCompletionReport as any}
                  onChange={(file) => updateField("finalCompletionReport", toUploadRef(file) as any)}
                  buttonLabel="Upload Final Completion Report"
                />
                <UploadPicker
                  apiBase={apiBase}
                  userEmail={authEmail || ""}
                  value={form.utilizationCertificate as any}
                  onChange={(file) => updateField("utilizationCertificate", toUploadRef(file) as any)}
                  buttonLabel="Upload Utilization Certificate"
                />
                <UploadPicker
                  apiBase={apiBase}
                  userEmail={authEmail || ""}
                  value={form.statementOfExpenditure as any}
                  onChange={(file) => updateField("statementOfExpenditure", toUploadRef(file) as any)}
                  buttonLabel="Upload Statement of Expenditure"
                />
              </div>
            </section>
          )}

          {isWip && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-900">Progress Monitoring (Work in Progress)</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {["wipProgress1", "wipProgress2", "wipProgress3", "wipProgress4"].map((key, idx) => (
                  <UploadPicker
                    key={key}
                    apiBase={apiBase}
                    userEmail={authEmail || ""}
                    value={(form as any)[key]}
                    onChange={(file) => updateField(key as keyof ExternalFormState, toUploadRef(file) as any)}
                    buttonLabel={`Upload Progress Report ${idx + 1}`}
                  />
                ))}
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <UploadPicker
                  apiBase={apiBase}
                  userEmail={authEmail || ""}
                  value={form.achievementsPdf as any}
                  onChange={(file) => updateField("achievementsPdf", toUploadRef(file) as any)}
                  buttonLabel="Upload Achievements (single PDF)"
                />
                <UploadPicker
                  apiBase={apiBase}
                  userEmail={authEmail || ""}
                  value={form.outcomesPdf as any}
                  onChange={(file) => updateField("outcomesPdf", toUploadRef(file) as any)}
                  buttonLabel="Upload Outcomes / Deliverables (PDF)"
                />
              </div>
            </section>
          )}

          {isSanctioned && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-900">Sanctioned but Yet to Start</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <UploadPicker
                  apiBase={apiBase}
                  userEmail={authEmail || ""}
                  value={form.releaseOrderPending as any}
                  onChange={(file) => updateField("releaseOrderPending", toUploadRef(file) as any)}
                  buttonLabel="Upload Release Order (if issued)"
                />
              </div>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">9. Research Outputs</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {[
                { key: "outputPatent", label: "Patent", fileKey: "outputPatentFile" },
                { key: "outputJournal", label: "Journal Paper", fileKey: "outputJournalFile" },
                { key: "outputPrototype", label: "Prototype", fileKey: "outputPrototypeFile" },
                { key: "outputPolicy", label: "Policy Contribution", fileKey: "outputPolicyFile" },
                { key: "outputProduct", label: "Product", fileKey: "outputProductFile" },
              ].map((item) => (
                <div key={item.key} className="flex items-start gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={(form as any)[item.key]}
                      onChange={(e) => updateField(item.key as keyof ExternalFormState, e.target.checked)}
                    />
                    {item.label}
                  </label>
                  <div className="flex-1">
                    <UploadPicker
                      apiBase={apiBase}
                      userEmail={authEmail || ""}
                      value={(form as any)[item.fileKey]}
                      onChange={(file) => updateField(item.fileKey as keyof ExternalFormState, toUploadRef(file) as any)}
                      buttonLabel={`Upload ${item.label} proof (PDF)`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {approversError && <p className="text-sm text-red-600">{approversError}</p>}
          {approversLoading && <p className="text-sm text-slate-600">Loading approvers...</p>}
          {!approversLoading && approvers.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-base font-semibold text-slate-900">Approval authority</h3>
              <label className="mt-3 block text-sm font-medium text-slate-700">
                Select approval authority
                <select
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={(form as any).approvalAuthority || ""}
                  onChange={(e) => updateField("approvalAuthority" as keyof ExternalFormState, e.target.value)}
                >
                  <option value="">Select</option>
                  {approvers.map((appr) => (
                    <option key={appr.id} value={appr.email}>{appr.name} ({appr.role})</option>
                  ))}
                </select>
              </label>
            </section>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-slate-600">
              {saveError && <span className="text-red-600">{saveError}</span>}
              {saveSuccess && <span className="text-green-700">{saveSuccess}</span>}
            </div>
            <div className="flex items-center gap-3">
              <button className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100" onClick={onClose} type="button">
                Cancel
              </button>
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                onClick={handleSaveDraft}
                disabled={saving || !form.declarationAgreed || !form.projectStatus || !form.projectTitle}
                type="button"
              >
                {saving ? "Saving..." : "Save draft"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
