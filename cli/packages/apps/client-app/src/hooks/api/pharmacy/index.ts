/**
 * Pharmacy Hooks
 * TanStack Query hooks for pharmacy management system
 */

// Drug Catalog hooks
export {
  DRUG_CATALOG_QUERY_KEYS,
  useDrugCatalogs,
  useDrugCatalog,
  useDrugSchedules,
  useActiveDrugCatalog,
} from "./useDrugCatalog";

// Drug Search hooks
export {
  DRUG_SEARCH_QUERY_KEYS,
  useDrugSearch,
  useDrug,
  useDrugInteractions,
  useDrugContraindications,
  useDrugsByCatalog,
} from "./useDrugSearch";

// Interaction Check hooks
export {
  INTERACTION_CHECK_QUERY_KEYS,
  useCheckDrugInteractions,
  useCheckPatientDrugInteractions,
  useCheckPatientAllergies,
  useInteractionCheckMutation,
} from "./useDrugInteractionCheck";

// Prescription hooks
export {
  PRESCRIPTION_QUERY_KEYS,
  usePrescriptions,
  usePrescription,
  usePatientPrescriptions,
  usePendingPrescriptions,
  useReadyPrescriptions,
  useCreatePrescription,
  useVerifyPrescription,
  useDispensePrescription,
  useCancelPrescription,
} from "./usePrescriptions";
