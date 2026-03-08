"use client";

import UploadPicker, { UploadedRecord } from "../../../components/UploadPicker";
import { LaptopFormState } from "./laptopFormState";

type Props = {
  open: boolean;
  onClose: () => void;
  form: LaptopFormState;
  updateField: <K extends keyof LaptopFormState>(key: K, value: LaptopFormState[K]) => void;
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

function uploadToRef(upload: UploadedRecord | null) {
  if (!upload) return null;
  return { key: upload.key, url: upload.url, original_name: upload.original_name };
}

export default function LaptopFormModal({
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

  const updatePublication = (idx: number, field: string, value: string) => {
    const next = form.publications.map((row, i) => (i === idx ? { ...row, [field]: value } : row));
    updateField("publications", next as any);
  };

  const updateProject = (idx: number, field: string, value: string) => {
    const next = form.projects.map((row, i) => (i === idx ? { ...row, [field]: value } : row));
    updateField("projects", next as any);
  };

  const updatePatent = (idx: number, field: string, value: string) => {
    const next = form.patents.map((row, i) => (i === idx ? { ...row, [field]: value } : row));
    updateField("patents", next as any);
  };

  const updateConsultancy = (idx: number, field: string, value: string) => {
    const next = form.consultancies.map((row, i) => (i === idx ? { ...row, [field]: value } : row));
    updateField("consultancies", next as any);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
      <div className="relative h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Laptop grant</p>
            <h2 className="text-2xl font-semibold text-slate-900">Laptop grant application</h2>
            <p className="text-sm text-slate-600">Provide details and required proofs.</p>
          </div>
          <button
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">1. Applicant Details</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {[
                { label: "Name of the Faculty", key: "applicantName" },
                { label: "Designation", key: "designation" },
                { label: "Department", key: "department" },
                { label: "Date of Joining the University", key: "dateOfJoining", type: "date" },
                { label: "Contact Details", key: "contact" },
                { label: "Email ID", key: "email", type: "email" },
                { label: "Employee ID", key: "employeeId" },
              ].map((item) => (
                <label key={item.key} className="text-sm font-medium text-slate-700">
                  {item.label}
                  <input
                    type={(item as any).type || "text"}
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                    value={(form as any)[item.key]}
                    onChange={(e) => updateField(item.key as keyof LaptopFormState, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">2. Seed Grant Details</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Seed Grant Requested (₹)
              <input
                type="number"
                min="0"
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                value={form.seedGrant}
                onChange={(e) => updateField("seedGrant", e.target.value)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">3. Salary Account Details</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {["accountNumber", "bankName", "ifsc", "pan"].map((key) => (
                <label key={key} className="text-sm font-medium text-slate-700 capitalize">
                  {key === "ifsc" ? "IFSC Code" : key === "pan" ? "PAN Number" : key === "accountNumber" ? "Account Number" : "Bank Name"}
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                    value={(form as any)[key]}
                    onChange={(e) => updateField(key as keyof LaptopFormState, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">4. Publication Details (Last Two Years)</h3>
                <p className="text-sm text-slate-600">SCI / Scopus indexed only (up to 5 entries).</p>
              </div>
              <UploadPicker
                apiBase={apiBase}
                userEmail={authEmail || ""}
                value={form.publicationsProof as any}
                onChange={(file) => updateField("publicationsProof", uploadToRef(file) as any)}
                buttonLabel="Upload publications proof"
              />
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] border border-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    {[
                      "Title",
                      "Journal",
                      "DOI",
                      "SCI Impact Factor",
                      "Name of Author(s)",
                    ].map((col) => (
                      <th key={col} className="border-b border-slate-200 px-3 py-2">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.publications.map((row, idx) => (
                    <tr key={idx} className="odd:bg-white even:bg-slate-50">
                      {["title", "journal", "doi", "impactFactor", "authors"].map((field) => (
                        <td key={field} className="border-b border-slate-200 px-3 py-2">
                          <input
                            className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none"
                            value={(row as any)[field]}
                            onChange={(e) => updatePublication(idx, field, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">5. Government Funded Projects / Consultancies (Last Two Years)</h3>
                <p className="text-sm text-slate-600">Provide sanction details; upload sanction letter.</p>
              </div>
              <UploadPicker
                apiBase={apiBase}
                userEmail={authEmail || ""}
                value={form.sanctionLetters as any}
                onChange={(file) => updateField("sanctionLetters", uploadToRef(file) as any)}
                buttonLabel="Upload sanction letter"
              />
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] border border-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    {[
                      "Title of the Project",
                      "Funding Agency",
                      "Duration",
                      "Amount Sanctioned (₹)",
                      "Name of PI",
                      "Name of Co-PI",
                    ].map((col) => (
                      <th key={col} className="border-b border-slate-200 px-3 py-2">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.projects.map((row, idx) => (
                    <tr key={idx} className="odd:bg-white even:bg-slate-50">
                      {["title", "agency", "duration", "amount", "pi", "coPi"].map((field) => (
                        <td key={field} className="border-b border-slate-200 px-3 py-2">
                          <input
                            className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none"
                            value={(row as any)[field]}
                            onChange={(e) => updateProject(idx, field, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">6. Patents Published / Granted (Last Two Years)</h3>
              </div>
              <UploadPicker
                apiBase={apiBase}
                userEmail={authEmail || ""}
                value={form.patentProof as any}
                onChange={(file) => updateField("patentProof", uploadToRef(file) as any)}
                buttonLabel="Upload patent proof"
              />
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[720px] border border-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    {[
                      "Title of the Patent",
                      "Patent Number",
                      "Inventor(s)",
                      "Name of Applicant",
                      "Date of Publication / Grant",
                    ].map((col) => (
                      <th key={col} className="border-b border-slate-200 px-3 py-2">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.patents.map((row, idx) => (
                    <tr key={idx} className="odd:bg-white even:bg-slate-50">
                      {["title", "patentNumber", "inventors", "applicant", "publicationDate"].map((field) => (
                        <td key={field} className="border-b border-slate-200 px-3 py-2">
                          <input
                            className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none"
                            value={(row as any)[field]}
                            onChange={(e) => updatePatent(idx, field, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">7. Consultancy Details (Last Two Years)</h3>
                <p className="text-sm font-semibold text-amber-700">Important: The amount of consultancy should be credited to the University account.</p>
              </div>
              <UploadPicker
                apiBase={apiBase}
                userEmail={authEmail || ""}
                value={form.consultancyProof as any}
                onChange={(file) => updateField("consultancyProof", uploadToRef(file) as any)}
                buttonLabel="Upload consultancy proof"
              />
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[760px] border border-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    {[
                      "Title of the Consultancy",
                      "Client / Organisation Name",
                      "Nature of Consultancy",
                      "Duration",
                      "Sanctioned / Approval Date",
                      "Amount Received",
                      "Remarks",
                    ].map((col) => (
                      <th key={col} className="border-b border-slate-200 px-3 py-2">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {form.consultancies.map((row, idx) => (
                    <tr key={idx} className="odd:bg-white even:bg-slate-50">
                      {["title", "client", "nature", "duration", "approvalDate", "amount", "remarks"].map((field) => (
                        <td key={field} className="border-b border-slate-200 px-3 py-2">
                          <input
                            className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none"
                            value={(row as any)[field]}
                            onChange={(e) => updateConsultancy(idx, field, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">8. Additional Details (Professors only)</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-slate-700">
                Administrative Responsibility (if any)
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.adminResponsibility}
                  onChange={(e) => updateField("adminResponsibility", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Number of Ph.D. Students Guided
                <input
                  type="number"
                  min="0"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.phdGuided}
                  onChange={(e) => updateField("phdGuided", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Number of Ph.D. Students Currently Guiding
                <input
                  type="number"
                  min="0"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.phdGuiding}
                  onChange={(e) => updateField("phdGuiding", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">9. Declaration & Signature</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-slate-700">
                Date
                <input
                  type="date"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.declarationDate}
                  onChange={(e) => updateField("declarationDate", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Signature of the Applicant
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.declarationSignature}
                  onChange={(e) => updateField("declarationSignature", e.target.value)}
                />
              </label>
              <label className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={form.declarationAgreed}
                  onChange={(e) => updateField("declarationAgreed", e.target.checked)}
                />
                Confirmation (required)
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">10. Documents to be Attached (Checklist)</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <UploadPicker
                apiBase={apiBase}
                userEmail={authEmail || ""}
                value={form.proposalFile as any}
                onChange={(file) => updateField("proposalFile", uploadToRef(file) as any)}
                buttonLabel="Upload one-page proposal"
              />
              <UploadPicker
                apiBase={apiBase}
                userEmail={authEmail || ""}
                value={form.priceScreenshot as any}
                onChange={(file) => updateField("priceScreenshot", uploadToRef(file) as any)}
                buttonLabel="Upload laptop price screenshot"
              />
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
                  onChange={(e) => updateField("approvalAuthority" as keyof LaptopFormState, e.target.value)}
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
              <button
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                onClick={onClose}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                onClick={handleSaveDraft}
                disabled={saving || !form.declarationAgreed}
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
