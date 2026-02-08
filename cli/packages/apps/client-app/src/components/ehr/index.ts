/**
 * EHR Components Index
 */

export { PatientBanner } from "./PatientBanner";
export { PatientActions } from "./PatientActions";
export { PatientSearch, PatientSearchDialog } from "./PatientSearch";
export { ProblemList } from "./ProblemList";
export { MedicationList } from "./MedicationList";
export { AllergyList } from "./AllergyList";
export { VitalSignsPanel } from "./VitalSignsPanel";
export { LabResultsPanel } from "./LabResultsPanel";
export { VisitList } from "./VisitList";
export { OrderList } from "./OrderList";
export { DocumentList } from "./DocumentList";
export { AppointmentsList } from "./AppointmentsList";

// Clinical Notes
export * from "./ClinicalNotes";

// Add/Edit Dialogs
export { VitalTrendDialog } from "./VitalTrendDialog";
export { AddProblemDialog } from "./AddProblemDialog";
export { AddMedicationDialog } from "./AddMedicationDialog";
export { AddVitalsDialog } from "./AddVitalsDialog";
export { AddAllergyDialog } from "./AddAllergyDialog";
export { OrderLabDialog } from "./OrderLabDialog";
export { PatientFormDialog } from "./PatientFormDialog";

// Patient Management (RFC 0002)
export { PatientMergeDialog } from "./PatientMergeDialog";
export { PatientDuplicateCheckDialog } from "./PatientDuplicateCheckDialog";
