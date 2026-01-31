/**
 * BillingStats Component
 * Dashboard statistics for billing overview
 */

import {
  Box,
  Card,
  CardContent,
  Flex,
} from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  Clock,
  FileText,
  Receipt,
} from "lucide-react";
import { memo } from "react";
import { useInvoices, usePayments } from "@/hooks/api/billing";

interface BillingStatsProps {
  className?: string;
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof FileText;
  iconBgClass: string;
  iconColorClass: string;
  trend?: { value: number; isPositive: boolean };
  onClick?: () => void;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgClass,
  iconColorClass,
  trend,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-accent/50"
      )}
      onClick={onClick}
    >
      <CardContent className="pt-6">
        <Flex align="start" justify="between">
          <Box>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
            {trend && (
              <Flex
                align="center"
                gap="xs"
                className={cn(
                  "text-xs mt-2",
                  trend.isPositive ? "text-green-600" : "text-destructive"
                )}
              >
                {trend.isPositive ? (
                  <ArrowUp className="h-3 w-3" />
                ) : (
                  <ArrowDown className="h-3 w-3" />
                )}
                <span>{Math.abs(trend.value)}% from last period</span>
              </Flex>
            )}
          </Box>
          <Box className={cn("p-3 rounded-full", iconBgClass)}>
            <Icon className={cn("h-6 w-6", iconColorClass)} />
          </Box>
        </Flex>
      </CardContent>
    </Card>
  );
}

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className || ""}`} />
);

export const BillingStats = memo(function BillingStats({
  className,
}: BillingStatsProps) {
  const { data: pendingInvoices, isLoading: pendingLoading } = useInvoices({
    status: "pending",
  });
  const { data: overdueInvoices, isLoading: overdueLoading } = useInvoices({
    status: "overdue",
  });
  const { data: todayPayments, isLoading: paymentsLoading } = usePayments({
    fromDate: new Date().toISOString().split("T")[0],
    toDate: new Date().toISOString().split("T")[0],
  });

  const isLoading = pendingLoading || overdueLoading || paymentsLoading;

  if (isLoading) {
    return (
      <Box className={cn("grid grid-cols-1 md:grid-cols-4 gap-4", className)}>
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  // Calculate totals
  const pendingTotal =
    pendingInvoices?.data.reduce((sum, inv) => sum + inv.balanceDue, 0) || 0;
  const overdueTotal =
    overdueInvoices?.data.reduce((sum, inv) => sum + inv.balanceDue, 0) || 0;
  const todayTotal =
    todayPayments?.data.reduce((sum, pay) => sum + pay.amount, 0) || 0;

  // Get currency from first item or default
  const currencyCode =
    pendingInvoices?.data[0]?.currencyCode ||
    todayPayments?.data[0]?.currencyCode ||
    "USD";

  return (
    <Box className={cn("grid grid-cols-1 md:grid-cols-4 gap-4", className)}>
      <StatCard
        title="Pending Invoices"
        value={String(pendingInvoices?.data.length || 0)}
        subtitle={`${currencyCode} ${pendingTotal.toFixed(2)} total`}
        icon={FileText}
        iconBgClass="bg-blue-100 dark:bg-blue-900/30"
        iconColorClass="text-blue-600"
      />

      <StatCard
        title="Overdue"
        value={String(overdueInvoices?.data.length || 0)}
        subtitle={`${currencyCode} ${overdueTotal.toFixed(2)} outstanding`}
        icon={Clock}
        iconBgClass="bg-red-100 dark:bg-red-900/30"
        iconColorClass="text-red-600"
      />

      <StatCard
        title="Today's Collections"
        value={`${currencyCode} ${todayTotal.toFixed(2)}`}
        subtitle={`${todayPayments?.data.length || 0} payments`}
        icon={Banknote}
        iconBgClass="bg-green-100 dark:bg-green-900/30"
        iconColorClass="text-green-600"
      />

      <StatCard
        title="Total Outstanding"
        value={`${currencyCode} ${(pendingTotal + overdueTotal).toFixed(2)}`}
        subtitle="Across all invoices"
        icon={Receipt}
        iconBgClass="bg-purple-100 dark:bg-purple-900/30"
        iconColorClass="text-purple-600"
      />
    </Box>
  );
});

interface PatientBillingCardProps {
  patientId: string;
  patientName: string;
  className?: string;
}

export const PatientBillingCard = memo(function PatientBillingCard({
  patientId,
  patientName,
  className,
}: PatientBillingCardProps) {
  const { data: invoices, isLoading } = useInvoices({ patientId });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const pendingInvoices =
    invoices?.data.filter(
      (inv) => inv.status === "pending" || inv.status === "partially_paid"
    ) || [];
  const totalDue = pendingInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
  const currencyCode = invoices?.data[0]?.currencyCode || "USD";

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <Flex align="center" justify="between">
          <Box>
            <p className="font-medium">{patientName}</p>
            <p className="text-sm text-muted-foreground">
              {pendingInvoices.length} pending invoice
              {pendingInvoices.length !== 1 ? "s" : ""}
            </p>
          </Box>
          <Box className="text-right">
            <p className="text-sm text-muted-foreground">Total Due</p>
            <p
              className={cn(
                "text-xl font-bold",
                totalDue > 0 ? "text-destructive" : "text-green-600"
              )}
            >
              {totalDue > 0
                ? `${currencyCode} ${totalDue.toFixed(2)}`
                : "No balance"}
            </p>
          </Box>
        </Flex>
      </CardContent>
    </Card>
  );
});
