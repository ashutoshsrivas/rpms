"use client";

import UploadPicker, { UploadedRecord } from "../../../components/UploadPicker";
import { ConferenceFormState } from "./conferenceFormState";

export type ConferenceFormProps = {
  open: boolean;
  onClose: () => void;
  form: ConferenceFormState;
  updateField: <K extends keyof ConferenceFormState>(key: K, value: ConferenceFormState[K]) => void;
  handleSaveDraft: () => void;
  saving: boolean;
  saveError: string | null;
  saveSuccess: string | null;
  selectedUpload: UploadedRecord | null;
  setSelectedUpload: (upload: UploadedRecord | null) => void;
  approvers: { id: number; name: string; email: string; role: string }[];
  approversLoading: boolean;
  approversError: string | null;
  authEmail?: string;
  apiBase: string;
};

export default function ConferenceFormModal({
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
}: ConferenceFormProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-8">
      <div className="relative h-[90vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-slate-500">Conference / Workshop / FDP</p>
            <h2 className="text-2xl font-semibold text-slate-900">Event proposal</h2>
            <p className="text-sm text-slate-600">Provide details for the event-based funding request.</p>
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
            <h3 className="text-base font-semibold text-slate-900">For office use only</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                File Number
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.fileNumber}
                  onChange={(e) => updateField("fileNumber", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Date of Receipt
                <input
                  type="date"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.receiptDate}
                  onChange={(e) => updateField("receiptDate", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">1. Department Details</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Name of the Department
              <input
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                value={form.departmentName}
                onChange={(e) => updateField("departmentName", e.target.value)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">2. Convener / Coordinator Details</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Name of Convener / Coordinator
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.convenerName}
                  onChange={(e) => updateField("convenerName", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Phone Number – Landline (with STD code)
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.phoneLandline}
                  onChange={(e) => updateField("phoneLandline", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Mobile Number
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.phoneMobile}
                  onChange={(e) => updateField("phoneMobile", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Fax Number
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.faxNumber}
                  onChange={(e) => updateField("faxNumber", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Email Address
                <input
                  type="email"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.emailAddress}
                  onChange={(e) => updateField("emailAddress", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">3. Event Details</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Date(s) of Workshop / Seminar / STTP / Conference / FDP
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.eventDates}
                  onChange={(e) => updateField("eventDates", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Title of the Workshop / Seminar / STTP / Conference / FDP
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.eventTitle}
                  onChange={(e) => updateField("eventTitle", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">4. Objectives</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Objectives of the programme
              <textarea
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                rows={3}
                value={form.objectives}
                onChange={(e) => updateField("objectives", e.target.value)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">5. Academic Content</h3>
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Major topics to be discussed
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={form.majorTopics}
                  onChange={(e) => updateField("majorTopics", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Relevance of the programme
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={form.relevanceProgramme}
                  onChange={(e) => updateField("relevanceProgramme", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Relevance of organizing the programme on the proposed theme in the present-day context
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={form.relevanceThemeContext}
                  onChange={(e) => updateField("relevanceThemeContext", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Relevance of the theme / topic and its area of operation
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={form.relevanceArea}
                  onChange={(e) => updateField("relevanceArea", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">6. Status of the Programme</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Status
              <select
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                value={form.statusLevel}
                onChange={(e) => updateField("statusLevel", e.target.value)}
              >
                <option value="">Select</option>
                <option value="regional">Regional</option>
                <option value="national">National</option>
                <option value="international">International</option>
              </select>
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">7. Schedule & Duration</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Proposed Dates
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.proposedDates}
                  onChange={(e) => updateField("proposedDates", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Duration (Number of days)
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.durationDays}
                  onChange={(e) => updateField("durationDays", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">8. Collaboration Details</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Collaborating Departments / Institutions (if any)
              <textarea
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                rows={3}
                value={form.collaborationDetails}
                onChange={(e) => updateField("collaborationDetails", e.target.value)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">9. Participant Details</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-slate-700">
                Total Number of Participants
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.participantsTotal}
                  onChange={(e) => updateField("participantsTotal", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Participants from the same state – Faculty Members
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.sameStateFaculty}
                  onChange={(e) => updateField("sameStateFaculty", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Participants from the same state – Research Scholars
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.sameStateScholars}
                  onChange={(e) => updateField("sameStateScholars", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Participants from the same state – PG Students
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.sameStatePg}
                  onChange={(e) => updateField("sameStatePg", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Participants from other states – Faculty Members
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.otherStateFaculty}
                  onChange={(e) => updateField("otherStateFaculty", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Participants from other states – Research Scholars
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.otherStateScholars}
                  onChange={(e) => updateField("otherStateScholars", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Participants from other states – PG Students
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.otherStatePg}
                  onChange={(e) => updateField("otherStatePg", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Participants from foreign countries – Faculty Members
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.foreignFaculty}
                  onChange={(e) => updateField("foreignFaculty", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Participants from foreign countries – Research Scholars
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.foreignScholars}
                  onChange={(e) => updateField("foreignScholars", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Participants from foreign countries – PG Students
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.foreignPg}
                  onChange={(e) => updateField("foreignPg", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">10. Resource Persons</h3>
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Lead Papers
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={2}
                  value={form.resourceLeadPapers}
                  onChange={(e) => updateField("resourceLeadPapers", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Memorial Lectures
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={2}
                  value={form.resourceMemorialLectures}
                  onChange={(e) => updateField("resourceMemorialLectures", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Invited Talks
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={2}
                  value={form.resourceInvitedTalks}
                  onChange={(e) => updateField("resourceInvitedTalks", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">11. Programme Schedule</h3>
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Session-wise / Speaker-wise day-to-day schedule
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={3}
                  value={form.scheduleDetails}
                  onChange={(e) => updateField("scheduleDetails", e.target.value)}
                />
              </label>
              <UploadPicker
                apiBase={apiBase}
                userEmail={authEmail || ""}
                value={selectedUpload}
                onChange={setSelectedUpload}
                buttonLabel="Upload authenticated copy of schedule"
              />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">12. Venue Details</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Address of the venue
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={2}
                  value={form.venueAddress}
                  onChange={(e) => updateField("venueAddress", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Contact details of venue coordinator
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={2}
                  value={form.venueContact}
                  onChange={(e) => updateField("venueContact", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">13. Sponsorship & Funding</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Name of Co-sponsors / External funding agencies
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={2}
                  value={form.sponsors}
                  onChange={(e) => updateField("sponsors", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Amount of grant expected from each sponsor
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={2}
                  value={form.sponsorGrantExpected}
                  onChange={(e) => updateField("sponsorGrantExpected", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">14. Registration Fee</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Category-wise delegate / registration fee per head
              <textarea
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                rows={2}
                value={form.registrationFeeDetails}
                onChange={(e) => updateField("registrationFeeDetails", e.target.value)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">15. Proposed Budget – Expenditure</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {[
                { label: "Manpower including TA / DA / Honorarium", key: "budgetManpower" },
                { label: "Refreshments", key: "budgetRefreshments" },
                { label: "Accommodation expenses for invited speakers", key: "budgetAccommodation" },
                { label: "Conference kit, postage, stationery, xerox, certificates, awards, mementos", key: "budgetKitStationery" },
                { label: "Publication of pre-conference / information brochure / souvenir", key: "budgetPublicationBrochure" },
                { label: "Publication of abstract book / proceedings", key: "budgetAbstractBook" },
                { label: "Other expenditure (specify)", key: "budgetOther" },
              ].map((item) => (
                <label key={item.key} className="text-sm font-medium text-slate-700">
                  {item.label}
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                    value={(form as any)[item.key]}
                    onChange={(e) => updateField(item.key as keyof ConferenceFormState, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">16. Publications & Papers</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Total number of papers expected
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.papersExpected}
                  onChange={(e) => updateField("papersExpected", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Publications from GEU & GEHU authors
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.publicationsGEU}
                  onChange={(e) => updateField("publicationsGEU", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">17. Proposed Budget – Income</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {[
                { label: "Registration fees from delegates", key: "incomeRegistration" },
                { label: "Contribution by co-sponsors (agency-wise)", key: "incomeCoSponsor" },
                { label: "Income from advertisements", key: "incomeAds" },
                { label: "Other income (if any)", key: "incomeOther" },
              ].map((item) => (
                <label key={item.key} className="text-sm font-medium text-slate-700">
                  {item.label}
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                    value={(form as any)[item.key]}
                    onChange={(e) => updateField(item.key as keyof ConferenceFormState, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">18. Financial Summary</h3>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium text-slate-700">
                Total Expected Income
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.summaryTotalIncome}
                  onChange={(e) => updateField("summaryTotalIncome", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Gap in Budget (Expenditure – Income)
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.summaryBudgetGap}
                  onChange={(e) => updateField("summaryBudgetGap", e.target.value)}
                />
              </label>
              <label className="text-sm font-medium text-slate-700">
                Seed Grant sought from the University
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.summarySeedGrant}
                  onChange={(e) => updateField("summarySeedGrant", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">19. Previous Conferences Organized (with Seed Grant)</h3>
            <div className="mt-3 space-y-3">
              <label className="block text-sm font-medium text-slate-700">
                Previous conferences details (Title, Year, Seed Grant Received/Utilized, reports, certificates)
                <textarea
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  rows={4}
                  value={form.previousConferences}
                  onChange={(e) => updateField("previousConferences", e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Total Seed Grant Received in Previous Conferences (₹)
                <input
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                  value={form.totalSeedGrantReceived}
                  onChange={(e) => updateField("totalSeedGrantReceived", e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">20. List of Attachments (Checklist)</h3>
            <label className="mt-3 block text-sm font-medium text-slate-700">
              Attachments (announcement letter, schedule, budget, coordinator details, forwarding letter)
              <textarea
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                rows={3}
                value={form.attachmentsChecklist}
                onChange={(e) => updateField("attachmentsChecklist", e.target.value)}
              />
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-base font-semibold text-slate-900">21. Declaration (Mandatory)</h3>
            <div className="mt-3 space-y-3">
              <p className="text-sm text-slate-700">
                I/We certify that the information provided is correct, funds will be utilized for the stated purpose, and all reports/certificates will be submitted as required.
              </p>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={form.declarationAgreed}
                  onChange={(e) => updateField("declarationAgreed", e.target.checked)}
                />
                Confirmation (required)
              </label>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="text-sm font-medium text-slate-700">
                  Name(s) and Signature(s) of Organizing Coordinator(s)
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                    value={form.declarationNames}
                    onChange={(e) => updateField("declarationNames", e.target.value)}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Place
                  <input
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                    value={form.declarationPlace}
                    onChange={(e) => updateField("declarationPlace", e.target.value)}
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Date
                  <input
                    type="date"
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base focus:border-slate-400 focus:outline-none"
                    value={form.declarationDate}
                    onChange={(e) => updateField("declarationDate", e.target.value)}
                  />
                </label>
              </div>
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
                  onChange={(e) => updateField("approvalAuthority" as keyof ConferenceFormState, e.target.value)}
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
