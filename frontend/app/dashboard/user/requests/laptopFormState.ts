import { UploadedRecord } from "../../../components/UploadPicker";

export type LaptopFormState = ReturnType<typeof initialLaptopFormState>;

export type UploadRef = {
  key: string;
  url: string;
  original_name?: string;
};

const emptyUpload = null as UploadRef | null;

const emptyPublication = () => ({ title: "", journal: "", doi: "", impactFactor: "", authors: "" });
const emptyProject = () => ({ title: "", agency: "", duration: "", amount: "", pi: "", coPi: "" });
const emptyPatent = () => ({ title: "", patentNumber: "", inventors: "", applicant: "", publicationDate: "" });
const emptyConsultancy = () => ({ title: "", client: "", nature: "", duration: "", approvalDate: "", amount: "", remarks: "" });

export const initialLaptopFormState = () => ({
  applicantName: "",
  designation: "",
  department: "",
  dateOfJoining: "",
  contact: "",
  email: "",
  employeeId: "",
  seedGrant: "",
  accountNumber: "",
  bankName: "",
  ifsc: "",
  pan: "",
  publications: [emptyPublication(), emptyPublication(), emptyPublication(), emptyPublication(), emptyPublication()],
  publicationsProof: emptyUpload,
  projects: [emptyProject(), emptyProject(), emptyProject()],
  sanctionLetters: emptyUpload,
  patents: [emptyPatent(), emptyPatent()],
  patentProof: emptyUpload,
  consultancies: [emptyConsultancy(), emptyConsultancy()],
  consultancyProof: emptyUpload,
  adminResponsibility: "",
  phdGuided: "",
  phdGuiding: "",
  declarationDate: "",
  declarationSignature: "",
  proposalFile: emptyUpload,
  priceScreenshot: emptyUpload,
  approvalAuthority: "",
  declarationAgreed: false,
});
