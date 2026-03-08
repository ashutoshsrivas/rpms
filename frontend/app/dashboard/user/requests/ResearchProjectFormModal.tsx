"use client";

import UploadPicker, { UploadedRecord } from "../../../components/UploadPicker";
import { ResearchFormState } from "./formState";

export type Approver = {
  id: number;
  name: string;
  email: string;
  role: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  form: ResearchFormState;
  updateField: <K extends keyof ResearchFormState>(key: K, value: ResearchFormState[K]) => void;
  handleSaveDraft: () => void;
  saving: boolean;
  saveError: string | null;
  saveSuccess: string | null;
  selectedUpload: UploadedRecord | null;
  setSelectedUpload: (upload: UploadedRecord | null) => void;
  approvers: Approver[];
  approversLoading: boolean;
  approversError: string | null;
  authEmail?: string;
  apiBase: string;
};

export default function ResearchProjectFormModal({
  open,
  onClose,
  form,
  updateField,
  handleSaveDraft,
  saving,
  saveError,
  saveSuccess,
  selectedUpload,
  setSelectedUpload,
  approvers,
  approversLoading,
  approversError,
  authEmail,
  apiBase,
}: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
      <div className="relative h-[90vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Seed grant</p>
            <h2 className="text-2xl font-semibold text-slate-900">Research project application</h2>
            <p className="text-sm text-slate-600">Provide details to start your seed grant request.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">1. Investigator Details</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Name of Principal Investigator (PI)
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.piName}
                  onChange={(e) => updateField("piName", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Department of PI
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.piDepartment}
                  onChange={(e) => updateField("piDepartment", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Employee ID of PI
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.piEmployeeId}
                  onChange={(e) => updateField("piEmployeeId", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Name of Co-Principal Investigator (Co-PI)
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.coPiName}
                  onChange={(e) => updateField("coPiName", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Department of Co-PI
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.coPiDepartment}
                  onChange={(e) => updateField("coPiDepartment", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Employee ID of Co-PI
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.coPiEmployeeId}
                  onChange={(e) => updateField("coPiEmployeeId", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">2. Contact Information</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Contact Number (PI)
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.piContact}
                  onChange={(e) => updateField("piContact", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Email ID (PI)
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  type="email"
                  value={form.piEmail}
                  onChange={(e) => updateField("piEmail", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Contact Number (Co-PI)
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.coPiContact}
                  onChange={(e) => updateField("coPiContact", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Email ID (Co-PI)
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  type="email"
                  value={form.coPiEmail}
                  onChange={(e) => updateField("coPiEmail", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">3. Appointment Details</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Date of Joining the University (PI)
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  type="date"
                  value={form.piDoj}
                  onChange={(e) => updateField("piDoj", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Date of Joining the University (Co-PI)
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  type="date"
                  value={form.coPiDoj}
                  onChange={(e) => updateField("coPiDoj", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">4. Seed Grant Details</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Seed Grant Amount Requested
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  type="number"
                  min="0"
                  value={form.seedAmount}
                  onChange={(e) => updateField("seedAmount", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Category of Seed Grant
                <select
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.seedCategory}
                  onChange={(e) => updateField("seedCategory", e.target.value)}
                >
                  <option value="">Select</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">5. Research Proposal Title</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Title of the Seed Grant Research Proposal
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                value={form.proposalTitle}
                onChange={(e) => updateField("proposalTitle", e.target.value)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">6. Background of the Research</h3>
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Brief review of work already done / literature survey
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={form.backgroundWork}
                  onChange={(e) => updateField("backgroundWork", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Rationale for undertaking the proposed research
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={form.rationale}
                  onChange={(e) => updateField("rationale", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">7. Research Objectives</h3>
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Research Objectives
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={form.objectives}
                  onChange={(e) => updateField("objectives", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Preliminary investigations carried out, if any (optional)
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={form.prelimInvestigations}
                  onChange={(e) => updateField("prelimInvestigations", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Innovative component of the proposed research
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={form.innovation}
                  onChange={(e) => updateField("innovation", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">8. Research Methodology</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Detailed methodology to be adopted for carrying out the study
              <textarea
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                rows={4}
                value={form.methodology}
                onChange={(e) => updateField("methodology", e.target.value)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">9. Significance of the Proposed Study</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {[
                "Generation of new knowledge",
                "Development of new procedures",
                "Contribution to the research field",
                "Future research arising from outcomes",
                "Utilization of results",
                "Practical applications",
                "Expected publications in reputed journals",
              ].map((label) => (
                <label key={label} className="block text-sm font-medium text-slate-700">
                  {label}
                  <textarea
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                    rows={3}
                    value={(() => {
                      switch (label) {
                        case "Generation of new knowledge":
                          return form.significanceGeneration;
                        case "Development of new procedures":
                          return form.significanceProcedures;
                        case "Contribution to the research field":
                          return form.significanceContribution;
                        case "Future research arising from outcomes":
                          return form.significanceFutureResearch;
                        case "Utilization of results":
                          return form.significanceUtilization;
                        case "Practical applications":
                          return form.significanceApplications;
                        case "Expected publications in reputed journals":
                          return form.significancePublications;
                        default:
                          return "";
                      }
                    })()}
                    onChange={(e) => {
                      const value = e.target.value;
                      switch (label) {
                        case "Generation of new knowledge":
                          updateField("significanceGeneration", value);
                          break;
                        case "Development of new procedures":
                          updateField("significanceProcedures", value);
                          break;
                        case "Contribution to the research field":
                          updateField("significanceContribution", value);
                          break;
                        case "Future research arising from outcomes":
                          updateField("significanceFutureResearch", value);
                          break;
                        case "Utilization of results":
                          updateField("significanceUtilization", value);
                          break;
                        case "Practical applications":
                          updateField("significanceApplications", value);
                          break;
                        case "Expected publications in reputed journals":
                          updateField("significancePublications", value);
                          break;
                        default:
                          break;
                      }
                    }}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">10. Work Plan</h3>
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Phase-wise plan of action with time schedule
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={form.workPlanPhases}
                  onChange={(e) => updateField("workPlanPhases", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Clearly defined milestones
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={form.workPlanMilestones}
                  onChange={(e) => updateField("workPlanMilestones", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">11. Budget Estimate (Year-wise)</h3>
            <p className="mt-2 text-sm text-slate-600">Provide year-wise breakup for each category.</p>
            <div className="mt-4 space-y-3">
              {(
                [
                  { label: "Capital Equipment(s)", keys: ["budgetEquipmentYear1", "budgetEquipmentYear2", "budgetEquipmentYear3"] as const },
                  { label: "Consumables", keys: ["budgetConsumablesYear1", "budgetConsumablesYear2", "budgetConsumablesYear3"] as const },
                  { label: "Travel", keys: ["budgetTravelYear1", "budgetTravelYear2", "budgetTravelYear3"] as const },
                  { label: "Any Other Expenditure (specify)", keys: ["budgetOtherYear1", "budgetOtherYear2", "budgetOtherYear3"] as const },
                ] as const
              ).map(({ label, keys }) => (
                <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-sm font-semibold text-slate-800">{label}</p>
                  <div className="mt-2 grid gap-2 md:grid-cols-3">
                    {keys.map((key, idx) => (
                      <label key={key} className="text-xs font-medium text-slate-700">
                        {`Year ${idx + 1}`}
                        <input
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm focus:border-slate-400 focus:outline-none"
                          type="number"
                          min="0"
                          value={form[key]}
                          onChange={(e) => updateField(key, e.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">12. Output and Deliverables</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Expected outputs and deliverables from the project
              <textarea
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                rows={3}
                value={form.outputs}
                onChange={(e) => updateField("outputs", e.target.value)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">13. Anticipated Journal Publications</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              List of potential journals / publication plan
              <textarea
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                rows={3}
                value={form.anticipatedPublications}
                onChange={(e) => updateField("anticipatedPublications", e.target.value)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">14. Post-Project Activities</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Suggested post-project activities
              <textarea
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                rows={3}
                value={form.postProjectActivities}
                onChange={(e) => updateField("postProjectActivities", e.target.value)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">15. Potential External Funding Agencies</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Suggested external funding agencies for continuation of research
              <textarea
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                rows={3}
                value={form.externalFundingAgencies}
                onChange={(e) => updateField("externalFundingAgencies", e.target.value)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">16. Previous Research Achievements</h3>
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Scopus / SCI publications in last 3 years (with details)
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={form.achievementsPublications}
                  onChange={(e) => updateField("achievementsPublications", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Patents filed / granted
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={form.achievementsPatents}
                  onChange={(e) => updateField("achievementsPatents", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Research projects submitted, sanctioned, or completed with external funding
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={form.achievementsProjects}
                  onChange={(e) => updateField("achievementsProjects", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">17. Supporting Document Upload</h3>
            <p className="mt-2 text-sm text-slate-700">
              Attach relevant supporting documents (PDF, DOC/DOCX, MP4, PNG, JPG, TXT up to 10MB).
            </p>
            <div className="mt-3">
              {authEmail ? (
                <UploadPicker
                  apiBase={apiBase}
                  userEmail={authEmail}
                  value={selectedUpload}
                  onChange={setSelectedUpload}
                />
              ) : (
                <p className="text-sm text-red-600">Please sign in again to upload files.</p>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">18. Declaration</h3>
            <p className="mt-2 text-sm text-slate-700">
              [Declaration text goes here. Please provide the exact declaration content to include.]
            </p>
            <label className="mt-3 flex items-start gap-2 text-sm text-slate-800">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                checked={form.declarationAgreed}
                onChange={(e) => updateField("declarationAgreed", e.target.checked)}
              />
              <span>I/We agree to the declaration above.</span>
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">19. Approval Authority</h3>
            <p className="mt-2 text-sm text-slate-700">Select the approving authority (HOD/Admin) to route your request.</p>
            <div className="mt-3 space-y-2">
              {approversError && <p className="text-sm text-red-600">{approversError}</p>}
              <label className="block text-sm font-medium text-slate-700">
                Approval authority
                <select
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.approvalAuthority}
                  disabled={approversLoading}
                  onChange={(e) => updateField("approvalAuthority", e.target.value)}
                >
                  <option value="">{approversLoading ? "Loading..." : "Select"}</option>
                  {approvers.map((approver) => (
                    <option key={approver.id} value={approver.email}>
                      {`${approver.name} (${approver.role})`}
                    </option>
                  ))}
                  {form.approvalAuthority && !approvers.find((a) => a.email === form.approvalAuthority) && (
                    <option value={form.approvalAuthority}>{`Current: ${form.approvalAuthority}`}</option>
                  )}
                </select>
              </label>
            </div>
          </section>

          <div className="flex items-center justify-end gap-3 pb-2">
            <button
              className="rounded-md px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              onClick={onClose}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              type="button"
              onClick={handleSaveDraft}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save draft"}
            </button>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
            {saveSuccess && <p className="text-sm text-green-700">{saveSuccess}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
