/**
 * Financial Dashboard Component
 * Overview of revenue, billing, payments, and financial KPIs
 */

import { memo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Progress,
} from "@lazarus-life/ui-components";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  Receipt,
} from "lucide-react";
import type {
  RevenueOverview,
  RevenueByDepartment,
  BillingStats,
  BillingAgingReport,
  PaymentStats,
  InsuranceStats,
  FinancialKPIs,
} from "@lazarus-life/shared";

interface FinancialDashboardProps {
  revenueOverview?: RevenueOverview;
  revenueByDepartment?: RevenueByDepartment[];
  billingStats?: BillingStats;
  agingReport?: BillingAgingReport;
  paymentStats?: PaymentStats;
  insuranceStats?: InsuranceStats;
  kpis?: FinancialKPIs;
  isLoading?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const FinancialDashboard = memo(function FinancialDashboard({
  revenueOverview,
  revenueByDepartment,
  billingStats,
  agingReport,
  paymentStats,
  insuranceStats,
  kpis,
  isLoading = false,
}: FinancialDashboardProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading financial dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue Overview */}
      {revenueOverview && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(revenueOverview.totalRevenue)}
              </div>
              {revenueOverview.comparisonPeriod && (
                <p
                  className={`flex items-center text-xs ${
                    revenueOverview.comparisonPeriod.percentChange >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {revenueOverview.comparisonPeriod.percentChange >= 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-1 h-3 w-3" />
                  )}
                  {Math.abs(revenueOverview.comparisonPeriod.percentChange)}% vs last period
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collected</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(revenueOverview.collectedAmount)}
              </div>
              <Progress
                value={(revenueOverview.collectedAmount / revenueOverview.totalRevenue) * 100}
                className="mt-2 [&>div]:bg-green-500"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(revenueOverview.pendingAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {((revenueOverview.pendingAmount / revenueOverview.totalRevenue) * 100).toFixed(1)}%
                of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(revenueOverview.netRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                Write-offs: {formatCurrency(revenueOverview.writeOffs)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Billing & Payments */}
      <div className="grid grid-cols-2 gap-6">
        {/* Billing Stats */}
        {billingStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Billing Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{billingStats.totalInvoices}</p>
                  <p className="text-sm text-muted-foreground">Total Invoices</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{billingStats.paidInvoices}</p>
                  <p className="text-sm text-muted-foreground">Paid</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">
                    {billingStats.pendingInvoices}
                  </p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md bg-red-50 p-3">
                  <p className="text-lg font-bold text-red-600">{billingStats.overdueInvoices}</p>
                  <p className="text-sm text-red-700">Overdue</p>
                </div>
                <div className="rounded-md bg-muted p-3">
                  <p className="text-lg font-bold">{billingStats.averageDaysToPayment} days</p>
                  <p className="text-sm text-muted-foreground">Avg Days to Payment</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Average Invoice Value</p>
                <p className="text-xl font-bold">
                  {formatCurrency(billingStats.averageInvoiceValue)}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment Stats */}
        {paymentStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{paymentStats.totalPayments}</p>
                  <p className="text-sm text-muted-foreground">Transactions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(paymentStats.totalAmount)}</p>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Payment Methods</p>
                {paymentStats.byMethod?.map((method) => (
                  <div key={method.method} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {method.method}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{method.count}</span>
                    </div>
                    <span className="font-medium">{formatCurrency(method.amount)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-medium text-green-600">{paymentStats.successRate}%</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Aging Report */}
      {agingReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Accounts Receivable Aging
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-4">
              {[
                { key: "current", label: "Current", data: agingReport.current },
                { key: "days30", label: "1-30 Days", data: agingReport.days30 },
                { key: "days60", label: "31-60 Days", data: agingReport.days60 },
                { key: "days90", label: "61-90 Days", data: agingReport.days90 },
                { key: "over90", label: "90+ Days", data: agingReport.over90 },
              ].map(({ key, label, data }) => (
                <Card key={key}>
                  <CardContent className="pt-4">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-2xl font-bold">{formatCurrency(data.amount)}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.count} invoices ({data.percentage}%)
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue by Department */}
      {revenueByDepartment && revenueByDepartment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {revenueByDepartment.slice(0, 5).map((dept) => (
                <div key={dept.departmentId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{dept.departmentName}</span>
                    <span className="font-bold">{formatCurrency(dept.totalRevenue)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={dept.percentage} />
                    <span className="text-sm text-muted-foreground">{dept.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      {kpis && (
        <Card>
          <CardHeader>
            <CardTitle>Financial KPIs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{kpis.grossMargin}%</p>
                <p className="text-sm text-muted-foreground">Gross Margin</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{kpis.collectionsRatio}%</p>
                <p className="text-sm text-muted-foreground">Collections Ratio</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{kpis.daysInAR}</p>
                <p className="text-sm text-muted-foreground">Days in A/R</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{formatCurrency(kpis.averageDailyRevenue)}</p>
                <p className="text-sm text-muted-foreground">Avg Daily Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
});
