import { UploadedRecord } from "../../../components/UploadPicker";

export type UploadRef = { key: string; url: string; original_name?: string } | null;
export type ExternalFormState = ReturnType<typeof initialExternalFormState>;

const emptyUpload: UploadRef = null;

export const initialExternalFormState = () => ({
  name: "",
  piName: "",
  coPiName: "",
  designation: "",
  email: "",
  contact: "",
  projectTitle: "",
  projectTypeChoice: "",
  projectTypeText: "",
  academicYear: "",
  fundingAgency: "",
  fundingAgencyCategory: "",
  projectStatus: "",
  declarationAgreed: false,
  sanctionLetter: emptyUpload,
  // Completed
  completionYear: "",
  releaseOrder: emptyUpload,
  progressReport1: emptyUpload,
  progressReport2: emptyUpload,
  progressReport3: emptyUpload,
  progressReport4: emptyUpload,
  finalCompletionReport: emptyUpload,
  utilizationCertificate: emptyUpload,
  statementOfExpenditure: emptyUpload,
  // Work in progress
  wipProgress1: emptyUpload,
  wipProgress2: emptyUpload,
  wipProgress3: emptyUpload,
  wipProgress4: emptyUpload,
  achievementsPdf: emptyUpload,
  outcomesPdf: emptyUpload,
  // Sanctioned not started
  releaseOrderPending: emptyUpload,
  // Research outputs
  outputPatent: false,
  outputJournal: false,
  outputPrototype: false,
  outputPolicy: false,
  outputProduct: false,
  outputPatentFile: emptyUpload,
  outputJournalFile: emptyUpload,
  outputPrototypeFile: emptyUpload,
  outputPolicyFile: emptyUpload,
  outputProductFile: emptyUpload,
  approvalAuthority: "",
});
