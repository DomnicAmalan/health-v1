/**
 * Revenue Metrics Dashboard Component
 * Uses Cube.js for analytics queries
 */

import { Card, CardContent, CardHeader, CardTitle } from "@lazarus-life/ui-components";
import { useCubeQuery } from '@cubejs-client/react';
import { ArrowDown, ArrowUp, DollarSign, TrendingUp } from "lucide-react";
import { cubejsApi, formatCurrency, formatPercent } from "@/lib/analytics/cubeClient";

interface MetricCardProps {
  title: string;
  value: string;
  change?: number;
  isLoading?: boolean;
}

function MetricCard({ title, value, change, isLoading }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <DollarSign className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {change !== undefined && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                {isPositive ? (
                  <ArrowUp className="h-3 w-3 text-green-500" />
                ) : (
                  <ArrowDown className="h-3 w-3 text-red-500" />
                )}
                <span className={isPositive ? "text-green-500" : "text-red-500"}>
                  {formatPercent(Math.abs(change))}
                </span>
                <span>vs last month</span>
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function RevenueMetrics() {
  // Total revenue this month
  const { resultSet: currentMonth, isLoading: loadingCurrent } = useCubeQuery(
    {
      measures: ['Revenue.totalRevenue', 'Revenue.collectedRevenue', 'Revenue.collectionRate'],
      timeDimensions: [
        {
          dimension: 'Revenue.createdAt',
          dateRange: 'This month',
        },
      ],
    },
    { cubejsApi }
  );

  // Last month for comparison
  const { resultSet: lastMonth } = useCubeQuery(
    {
      measures: ['Revenue.totalRevenue'],
      timeDimensions: [
        {
          dimension: 'Revenue.createdAt',
          dateRange: 'Last month',
        },
      ],
    },
    { cubejsApi }
  );

  const currentData = currentMonth?.tablePivot()[0];
  const lastMonthData = lastMonth?.tablePivot()[0];

  const totalRevenue = currentData?.['Revenue.totalRevenue'] as number || 0;
  const collectedRevenue = currentData?.['Revenue.collectedRevenue'] as number || 0;
  const collectionRate = currentData?.['Revenue.collectionRate'] as number || 0;
  const lastMonthRevenue = lastMonthData?.['Revenue.totalRevenue'] as number || 0;

  const revenueChange = lastMonthRevenue > 0
    ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0;

  const outstanding = totalRevenue - collectedRevenue;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Revenue"
        value={formatCurrency(totalRevenue)}
        change={revenueChange}
        isLoading={loadingCurrent}
      />
      <MetricCard
        title="Collected"
        value={formatCurrency(collectedRevenue)}
        isLoading={loadingCurrent}
      />
      <MetricCard
        title="Outstanding"
        value={formatCurrency(outstanding)}
        isLoading={loadingCurrent}
      />
      <MetricCard
        title="Collection Rate"
        value={formatPercent(collectionRate)}
        isLoading={loadingCurrent}
      />
    </div>
  );
}
