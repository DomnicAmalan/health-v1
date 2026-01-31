/**
 * useInsurance Hook
 * TanStack Query hooks for insurance management (payers, plans, policies, claims)
 */

import { API_ROUTES } from "@lazarus-life/shared/api/routes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  InsurancePayer,
  InsurancePlan,
  PatientInsurancePolicy,
  InsurancePreauth,
  InsuranceClaim,
  CreatePreauthRequest,
  SubmitClaimRequest,
} from "@lazarus-life/shared/types/billing";

export const INSURANCE_QUERY_KEYS = {
  payers: {
    all: ["billing", "insurance", "payers"] as const,
    list: () => [...INSURANCE_QUERY_KEYS.payers.all, "list"] as const,
    detail: (id: string) => [...INSURANCE_QUERY_KEYS.payers.all, "detail", id] as const,
  },
  plans: {
    all: ["billing", "insurance", "plans"] as const,
    list: () => [...INSURANCE_QUERY_KEYS.plans.all, "list"] as const,
    detail: (id: string) => [...INSURANCE_QUERY_KEYS.plans.all, "detail", id] as const,
    byPayer: (payerId: string) => [...INSURANCE_QUERY_KEYS.plans.all, "payer", payerId] as const,
  },
  policies: {
    all: ["billing", "insurance", "policies"] as const,
    list: () => [...INSURANCE_QUERY_KEYS.policies.all, "list"] as const,
    detail: (id: string) => [...INSURANCE_QUERY_KEYS.policies.all, "detail", id] as const,
    byPatient: (patientId: string) =>
      [...INSURANCE_QUERY_KEYS.policies.all, "patient", patientId] as const,
  },
  preauths: {
    all: ["billing", "insurance", "preauths"] as const,
    list: () => [...INSURANCE_QUERY_KEYS.preauths.all, "list"] as const,
    detail: (id: string) => [...INSURANCE_QUERY_KEYS.preauths.all, "detail", id] as const,
    byPatient: (patientId: string) =>
      [...INSURANCE_QUERY_KEYS.preauths.all, "patient", patientId] as const,
  },
  claims: {
    all: ["billing", "insurance", "claims"] as const,
    list: () => [...INSURANCE_QUERY_KEYS.claims.all, "list"] as const,
    detail: (id: string) => [...INSURANCE_QUERY_KEYS.claims.all, "detail", id] as const,
    byPatient: (patientId: string) =>
      [...INSURANCE_QUERY_KEYS.claims.all, "patient", patientId] as const,
    byInvoice: (invoiceId: string) =>
      [...INSURANCE_QUERY_KEYS.claims.all, "invoice", invoiceId] as const,
  },
};

// ============== Payers ==============

/**
 * Get all insurance payers
 */
export function useInsurancePayers() {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.payers.list(),
    queryFn: async () => {
      const response = await apiClient.get<{ payers: InsurancePayer[] }>(
        API_ROUTES.BILLING.INSURANCE.PAYERS.LIST
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.payers;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get a specific payer by ID
 */
export function useInsurancePayer(payerId: string) {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.payers.detail(payerId),
    queryFn: async () => {
      const response = await apiClient.get<InsurancePayer>(
        API_ROUTES.BILLING.INSURANCE.PAYERS.GET(payerId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!payerId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create an insurance payer
 */
export function useCreateInsurancePayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: Omit<InsurancePayer, "id" | "createdAt" | "updatedAt">) => {
      const response = await apiClient.post<InsurancePayer>(
        API_ROUTES.BILLING.INSURANCE.PAYERS.CREATE,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_QUERY_KEYS.payers.all });
    },
  });
}

// ============== Plans ==============

/**
 * Get all insurance plans
 */
export function useInsurancePlans() {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.plans.list(),
    queryFn: async () => {
      const response = await apiClient.get<{ plans: InsurancePlan[] }>(
        API_ROUTES.BILLING.INSURANCE.PLANS.LIST
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.plans;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get a specific plan by ID
 */
export function useInsurancePlan(planId: string) {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.plans.detail(planId),
    queryFn: async () => {
      const response = await apiClient.get<InsurancePlan>(
        API_ROUTES.BILLING.INSURANCE.PLANS.GET(planId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!planId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get plans for a specific payer
 */
export function usePayerPlans(payerId: string) {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.plans.byPayer(payerId),
    queryFn: async () => {
      const response = await apiClient.get<{ plans: InsurancePlan[] }>(
        API_ROUTES.BILLING.INSURANCE.PLANS.BY_PAYER(payerId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.plans;
    },
    enabled: !!payerId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============== Policies ==============

/**
 * Get all insurance policies
 */
export function useInsurancePolicies() {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.policies.list(),
    queryFn: async () => {
      const response = await apiClient.get<{ policies: PatientInsurancePolicy[] }>(
        API_ROUTES.BILLING.INSURANCE.POLICIES.LIST
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.policies;
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Get a specific policy by ID
 */
export function usePatientInsurancePolicy(policyId: string) {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.policies.detail(policyId),
    queryFn: async () => {
      const response = await apiClient.get<PatientInsurancePolicy>(
        API_ROUTES.BILLING.INSURANCE.POLICIES.GET(policyId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!policyId,
    staleTime: 60 * 1000,
  });
}

/**
 * Get policies for a specific patient
 */
export function usePatientPolicies(patientId: string) {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.policies.byPatient(patientId),
    queryFn: async () => {
      const response = await apiClient.get<{ policies: PatientInsurancePolicy[] }>(
        API_ROUTES.BILLING.INSURANCE.POLICIES.BY_PATIENT(patientId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.policies;
    },
    enabled: !!patientId,
    staleTime: 60 * 1000,
  });
}

/** Request to create a patient insurance policy */
interface CreatePatientPolicyRequest {
  patientId: string;
  payerId: string;
  planId: string;
  policyNumber: string;
  memberId?: string;
  groupNumber?: string;
  relationToHolder: "self" | "spouse" | "child" | "parent" | "other";
  holderName?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  isPrimary?: boolean;
}

/**
 * Create an insurance policy
 */
export function useCreatePatientInsurancePolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreatePatientPolicyRequest) => {
      const response = await apiClient.post<PatientInsurancePolicy>(
        API_ROUTES.BILLING.INSURANCE.POLICIES.CREATE,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_QUERY_KEYS.policies.all });
      if (data.patientId) {
        queryClient.invalidateQueries({
          queryKey: INSURANCE_QUERY_KEYS.policies.byPatient(data.patientId),
        });
      }
    },
  });
}

// ============== Pre-Authorizations ==============

/**
 * Get all pre-authorizations
 */
export function useInsurancePreauths() {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.preauths.list(),
    queryFn: async () => {
      const response = await apiClient.get<{ preauths: InsurancePreauth[] }>(
        API_ROUTES.BILLING.INSURANCE.PREAUTHS.LIST
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.preauths;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get a specific pre-authorization by ID
 */
export function useInsurancePreauth(preauthId: string) {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.preauths.detail(preauthId),
    queryFn: async () => {
      const response = await apiClient.get<InsurancePreauth>(
        API_ROUTES.BILLING.INSURANCE.PREAUTHS.GET(preauthId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!preauthId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get pre-authorizations for a specific patient
 */
export function usePatientInsurancePreauths(patientId: string) {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.preauths.byPatient(patientId),
    queryFn: async () => {
      const response = await apiClient.get<{ preauths: InsurancePreauth[] }>(
        API_ROUTES.BILLING.INSURANCE.PREAUTHS.BY_PATIENT(patientId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.preauths;
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });
}

/**
 * Create a pre-authorization request
 */
export function useCreateInsurancePreauth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreatePreauthRequest) => {
      const response = await apiClient.post<InsurancePreauth>(
        API_ROUTES.BILLING.INSURANCE.PREAUTHS.CREATE,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_QUERY_KEYS.preauths.all });
      if (data.patientId) {
        queryClient.invalidateQueries({
          queryKey: INSURANCE_QUERY_KEYS.preauths.byPatient(data.patientId),
        });
      }
    },
  });
}

/**
 * Submit a pre-authorization
 */
export function useSubmitInsurancePreauth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (preauthId: string) => {
      const response = await apiClient.post<InsurancePreauth>(
        API_ROUTES.BILLING.INSURANCE.PREAUTHS.SUBMIT(preauthId),
        {}
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (_, preauthId) => {
      queryClient.invalidateQueries({
        queryKey: INSURANCE_QUERY_KEYS.preauths.detail(preauthId),
      });
      queryClient.invalidateQueries({ queryKey: INSURANCE_QUERY_KEYS.preauths.all });
    },
  });
}

/**
 * Approve a pre-authorization (admin action)
 */
export function useApproveInsurancePreauth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      preauthId,
      approvedAmount,
      approvalNotes,
    }: {
      preauthId: string;
      approvedAmount: number;
      approvalNotes?: string;
    }) => {
      const response = await apiClient.post<InsurancePreauth>(
        API_ROUTES.BILLING.INSURANCE.PREAUTHS.APPROVE(preauthId),
        { approvedAmount, approvalNotes }
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (_, { preauthId }) => {
      queryClient.invalidateQueries({
        queryKey: INSURANCE_QUERY_KEYS.preauths.detail(preauthId),
      });
      queryClient.invalidateQueries({ queryKey: INSURANCE_QUERY_KEYS.preauths.all });
    },
  });
}

/**
 * Deny a pre-authorization (admin action)
 */
export function useDenyInsurancePreauth() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      preauthId,
      denialReason,
    }: {
      preauthId: string;
      denialReason: string;
    }) => {
      const response = await apiClient.post<InsurancePreauth>(
        API_ROUTES.BILLING.INSURANCE.PREAUTHS.DENY(preauthId),
        { denialReason }
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (_, { preauthId }) => {
      queryClient.invalidateQueries({
        queryKey: INSURANCE_QUERY_KEYS.preauths.detail(preauthId),
      });
      queryClient.invalidateQueries({ queryKey: INSURANCE_QUERY_KEYS.preauths.all });
    },
  });
}

// ============== Claims ==============

/**
 * Get all insurance claims
 */
export function useInsuranceClaims() {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.claims.list(),
    queryFn: async () => {
      const response = await apiClient.get<{ claims: InsuranceClaim[] }>(
        API_ROUTES.BILLING.INSURANCE.CLAIMS.LIST
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.claims;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Get a specific claim by ID
 */
export function useInsuranceClaim(claimId: string) {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.claims.detail(claimId),
    queryFn: async () => {
      const response = await apiClient.get<InsuranceClaim>(
        API_ROUTES.BILLING.INSURANCE.CLAIMS.GET(claimId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    enabled: !!claimId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get claims for a specific patient
 */
export function usePatientClaims(patientId: string) {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.claims.byPatient(patientId),
    queryFn: async () => {
      const response = await apiClient.get<{ claims: InsuranceClaim[] }>(
        API_ROUTES.BILLING.INSURANCE.CLAIMS.BY_PATIENT(patientId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.claims;
    },
    enabled: !!patientId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get claims for a specific invoice
 */
export function useInvoiceClaims(invoiceId: string) {
  return useQuery({
    queryKey: INSURANCE_QUERY_KEYS.claims.byInvoice(invoiceId),
    queryFn: async () => {
      const response = await apiClient.get<{ claims: InsuranceClaim[] }>(
        API_ROUTES.BILLING.INSURANCE.CLAIMS.BY_INVOICE(invoiceId)
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data.claims;
    },
    enabled: !!invoiceId,
    staleTime: 30 * 1000,
  });
}

/**
 * Create an insurance claim
 */
export function useCreateInsuranceClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: SubmitClaimRequest) => {
      const response = await apiClient.post<InsuranceClaim>(
        API_ROUTES.BILLING.INSURANCE.CLAIMS.CREATE,
        request
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: INSURANCE_QUERY_KEYS.claims.all });
      if (data.patientId) {
        queryClient.invalidateQueries({
          queryKey: INSURANCE_QUERY_KEYS.claims.byPatient(data.patientId),
        });
      }
      if (data.invoiceId) {
        queryClient.invalidateQueries({
          queryKey: INSURANCE_QUERY_KEYS.claims.byInvoice(data.invoiceId),
        });
      }
    },
  });
}

/**
 * Submit a claim to insurance
 */
export function useSubmitInsuranceClaim() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (claimId: string) => {
      const response = await apiClient.post<InsuranceClaim>(
        API_ROUTES.BILLING.INSURANCE.CLAIMS.SUBMIT(claimId),
        {}
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (_, claimId) => {
      queryClient.invalidateQueries({
        queryKey: INSURANCE_QUERY_KEYS.claims.detail(claimId),
      });
      queryClient.invalidateQueries({ queryKey: INSURANCE_QUERY_KEYS.claims.all });
    },
  });
}

/**
 * Update claim status
 */
export function useUpdateClaimStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      claimId,
      status,
      paidAmount,
      denialReason,
    }: {
      claimId: string;
      status: string;
      paidAmount?: number;
      denialReason?: string;
    }) => {
      const response = await apiClient.post<InsuranceClaim>(
        API_ROUTES.BILLING.INSURANCE.CLAIMS.UPDATE_STATUS(claimId),
        { status, paidAmount, denialReason }
      );
      if (response.error) throw new Error(response.error.message);
      if (!response.data) throw new Error("No data returned");
      return response.data;
    },
    onSuccess: (_, { claimId }) => {
      queryClient.invalidateQueries({
        queryKey: INSURANCE_QUERY_KEYS.claims.detail(claimId),
      });
      queryClient.invalidateQueries({ queryKey: INSURANCE_QUERY_KEYS.claims.all });
    },
  });
}
