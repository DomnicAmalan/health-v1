/**
 * Financial Dashboard Types
 * Types for revenue, billing, and financial metrics
 */

import type { TimePeriod } from "./clinical";

// Revenue Overview
export interface RevenueOverview {
  period: TimePeriod;
  totalRevenue: number;
  collectedAmount: number;
  pendingAmount: number;
  writeOffs: number;
  refunds: number;
  netRevenue: number;
  comparisonPeriod?: {
    totalRevenue: number;
    percentChange: number;
  };
}

export interface RevenueByDepartment {
  departmentId: string;
  departmentName: string;
  totalRevenue: number;
  collectedAmount: number;
  pendingAmount: number;
  percentage: number;
}

export interface RevenueByService {
  serviceId: string;
  serviceName: string;
  serviceType: string;
  totalRevenue: number;
  unitsSold: number;
  averagePrice: number;
  percentage: number;
}

export interface RevenueTrend {
  date: string;
  revenue: number;
  collections: number;
  target?: number;
}

// Billing Statistics
export interface BillingStats {
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  cancelledInvoices: number;
  partiallyPaidInvoices: number;
  averageInvoiceValue: number;
  averageDaysToPayment: number;
}

export interface BillingByStatus {
  status: "draft" | "pending" | "paid" | "partial" | "overdue" | "cancelled";
  count: number;
  amount: number;
  percentage: number;
}

export interface BillingAgingReport {
  current: AgingBucket;
  days30: AgingBucket;
  days60: AgingBucket;
  days90: AgingBucket;
  over90: AgingBucket;
}

export interface AgingBucket {
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

// Payment Statistics
export interface PaymentStats {
  totalPayments: number;
  totalAmount: number;
  byMethod: PaymentByMethod[];
  averagePaymentAmount: number;
  successRate: number;
  failedPayments: number;
  refundedAmount: number;
}

export interface PaymentByMethod {
  method: "cash" | "card" | "upi" | "bank_transfer" | "insurance" | "other";
  count: number;
  amount: number;
  percentage: number;
}

export interface PaymentTrend {
  date: string;
  amount: number;
  count: number;
}

// Insurance Statistics
export interface InsuranceStats {
  totalClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  pendingClaims: number;
  totalClaimedAmount: number;
  approvedAmount: number;
  rejectedAmount: number;
  pendingAmount: number;
  averageProcessingDays: number;
  approvalRate: number;
}

export interface InsuranceByProvider {
  providerId: string;
  providerName: string;
  totalClaims: number;
  approvedClaims: number;
  rejectedClaims: number;
  totalAmount: number;
  approvalRate: number;
}

export interface ClaimsTrend {
  date: string;
  submitted: number;
  approved: number;
  rejected: number;
  amount: number;
}

// Expense Tracking
export interface ExpenseOverview {
  period: TimePeriod;
  totalExpenses: number;
  operationalExpenses: number;
  staffExpenses: number;
  inventoryExpenses: number;
  equipmentExpenses: number;
  otherExpenses: number;
}

export interface ExpenseByCategory {
  category: string;
  amount: number;
  percentage: number;
  budgeted: number;
  variance: number;
}

// Financial KPIs
export interface FinancialKPIs {
  grossMargin: number;
  operatingMargin: number;
  collectionsRatio: number;
  daysInAR: number; // Days in Accounts Receivable
  revenuePerBed: number;
  revenuePerPatient: number;
  costPerPatient: number;
  averageDailyRevenue: number;
}

// Dashboard Summary
export interface FinancialDashboardSummary {
  revenueOverview: RevenueOverview;
  billingStats: BillingStats;
  paymentStats: PaymentStats;
  insuranceStats: InsuranceStats;
  kpis: FinancialKPIs;
  revenueTrend: RevenueTrend[];
  revenueByDepartment: RevenueByDepartment[];
  agingReport: BillingAgingReport;
  lastUpdated: string;
}
