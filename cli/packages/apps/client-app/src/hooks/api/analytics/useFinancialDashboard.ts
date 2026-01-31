/**
 * Financial Dashboard Hooks
 * TanStack Query hooks for financial analytics and reporting
 */

import { useQuery } from "@tanstack/react-query";
import { API_ROUTES } from "@lazarus-life/shared";
import { useApiClient } from "@/lib/api/client";
import type {
  TimePeriod,
  DateRange,
  RevenueOverview,
  RevenueByDepartment,
  RevenueByService,
  RevenueTrend,
  BillingStats,
  BillingAgingReport,
  PaymentStats,
  PaymentByMethod,
  PaymentTrend,
  InsuranceStats,
  InsuranceByProvider,
  ClaimsTrend,
  ExpenseOverview,
  ExpenseByCategory,
  FinancialKPIs,
  FinancialDashboardSummary,
} from "@lazarus-life/shared";

// Query keys
export const financialDashboardKeys = {
  all: ["financial-dashboard"] as const,
  summary: () => [...financialDashboardKeys.all, "summary"] as const,
  revenue: () => [...financialDashboardKeys.all, "revenue"] as const,
  revenueByDepartment: () => [...financialDashboardKeys.all, "revenue", "by-department"] as const,
  revenueByService: () => [...financialDashboardKeys.all, "revenue", "by-service"] as const,
  revenueTrend: (period: TimePeriod) => [...financialDashboardKeys.all, "revenue", "trend", period] as const,
  billing: () => [...financialDashboardKeys.all, "billing"] as const,
  billingAging: () => [...financialDashboardKeys.all, "billing", "aging"] as const,
  payments: () => [...financialDashboardKeys.all, "payments"] as const,
  paymentsByMethod: () => [...financialDashboardKeys.all, "payments", "by-method"] as const,
  paymentsTrend: (period: TimePeriod) => [...financialDashboardKeys.all, "payments", "trend", period] as const,
  insurance: () => [...financialDashboardKeys.all, "insurance"] as const,
  insuranceByProvider: () => [...financialDashboardKeys.all, "insurance", "by-provider"] as const,
  claimsTrend: (period: TimePeriod) => [...financialDashboardKeys.all, "insurance", "claims", "trend", period] as const,
  expenses: () => [...financialDashboardKeys.all, "expenses"] as const,
  expensesByCategory: () => [...financialDashboardKeys.all, "expenses", "by-category"] as const,
  kpis: () => [...financialDashboardKeys.all, "kpis"] as const,
};

// Summary
export function useFinancialDashboardSummary(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.summary(),
    queryFn: async () => {
      const response = await apiClient.get<FinancialDashboardSummary>(API_ROUTES.ANALYTICS.FINANCIAL.SUMMARY, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Revenue
export function useRevenueOverview(period?: TimePeriod, dateRange?: DateRange) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.revenue(),
    queryFn: async () => {
      const response = await apiClient.get<RevenueOverview>(API_ROUTES.ANALYTICS.FINANCIAL.REVENUE, {
        params: { period, ...dateRange },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useRevenueByDepartment(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.revenueByDepartment(),
    queryFn: async () => {
      const response = await apiClient.get<RevenueByDepartment[]>(API_ROUTES.ANALYTICS.FINANCIAL.REVENUE_BY_DEPARTMENT, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useRevenueByService(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.revenueByService(),
    queryFn: async () => {
      const response = await apiClient.get<RevenueByService[]>(API_ROUTES.ANALYTICS.FINANCIAL.REVENUE_BY_SERVICE, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useRevenueTrend(period: TimePeriod = "month") {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.revenueTrend(period),
    queryFn: async () => {
      const response = await apiClient.get<RevenueTrend[]>(API_ROUTES.ANALYTICS.FINANCIAL.REVENUE_TREND, {
        params: { period },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Billing
export function useBillingStats() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.billing(),
    queryFn: async () => {
      const response = await apiClient.get<BillingStats>(API_ROUTES.ANALYTICS.FINANCIAL.BILLING_STATS);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useBillingAgingReport() {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.billingAging(),
    queryFn: async () => {
      const response = await apiClient.get<BillingAgingReport>(API_ROUTES.ANALYTICS.FINANCIAL.BILLING_AGING);
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Payments
export function usePaymentStats(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.payments(),
    queryFn: async () => {
      const response = await apiClient.get<PaymentStats>(API_ROUTES.ANALYTICS.FINANCIAL.PAYMENT_STATS, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function usePaymentsByMethod(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.paymentsByMethod(),
    queryFn: async () => {
      const response = await apiClient.get<PaymentByMethod[]>(API_ROUTES.ANALYTICS.FINANCIAL.PAYMENT_BY_METHOD, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function usePaymentsTrend(period: TimePeriod = "month") {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.paymentsTrend(period),
    queryFn: async () => {
      const response = await apiClient.get<PaymentTrend[]>(API_ROUTES.ANALYTICS.FINANCIAL.PAYMENT_TREND, {
        params: { period },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Insurance
export function useInsuranceStats(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.insurance(),
    queryFn: async () => {
      const response = await apiClient.get<InsuranceStats>(API_ROUTES.ANALYTICS.FINANCIAL.INSURANCE_STATS, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useInsuranceByProvider(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.insuranceByProvider(),
    queryFn: async () => {
      const response = await apiClient.get<InsuranceByProvider[]>(API_ROUTES.ANALYTICS.FINANCIAL.INSURANCE_BY_PROVIDER, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useClaimsTrend(period: TimePeriod = "month") {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.claimsTrend(period),
    queryFn: async () => {
      const response = await apiClient.get<ClaimsTrend[]>(API_ROUTES.ANALYTICS.FINANCIAL.CLAIMS_TREND, {
        params: { period },
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// Expenses
export function useExpenseOverview(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.expenses(),
    queryFn: async () => {
      const response = await apiClient.get<ExpenseOverview>(API_ROUTES.ANALYTICS.FINANCIAL.EXPENSES, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

export function useExpensesByCategory(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.expensesByCategory(),
    queryFn: async () => {
      const response = await apiClient.get<ExpenseByCategory[]>(API_ROUTES.ANALYTICS.FINANCIAL.EXPENSES_BY_CATEGORY, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}

// KPIs
export function useFinancialKPIs(period?: TimePeriod) {
  const apiClient = useApiClient();
  return useQuery({
    queryKey: financialDashboardKeys.kpis(),
    queryFn: async () => {
      const response = await apiClient.get<FinancialKPIs>(API_ROUTES.ANALYTICS.FINANCIAL.KPIS, {
        params: period ? { period } : undefined,
      });
      if (response.error) throw new Error(response.error.message);
      return response.data!;
    },
  });
}
