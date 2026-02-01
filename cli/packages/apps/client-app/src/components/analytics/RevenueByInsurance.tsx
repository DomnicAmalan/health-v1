/**
 * Revenue by Insurance Provider Component
 * Shows revenue breakdown by insurance companies
 */

import { Card, CardContent, CardHeader, CardTitle } from "@lazarus-life/ui-components";
import { useCubeQuery } from '@cubejs-client/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cubejsApi, formatCurrency } from "@/lib/analytics/cubeClient";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export function RevenueByInsurance() {
  const { resultSet, isLoading } = useCubeQuery(
    {
      measures: ['Revenue.totalRevenue', 'Revenue.collectedRevenue'],
      dimensions: ['Revenue.insuranceProvider'],
      timeDimensions: [
        {
          dimension: 'Revenue.createdAt',
          dateRange: 'This month',
        },
      ],
      order: {
        'Revenue.totalRevenue': 'desc',
      },
      limit: 6,
    },
    { cubejsApi }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Insurance Provider</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const chartData = resultSet?.tablePivot().map((item) => ({
    provider: (item['Revenue.insuranceProvider'] as string) || 'Self-Pay',
    billed: item['Revenue.totalRevenue'] as number || 0,
    collected: item['Revenue.collectedRevenue'] as number || 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by Insurance Provider</CardTitle>
        <p className="text-sm text-muted-foreground">This month</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="provider"
              style={{ fontSize: '11px' }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
            />
            <Legend />
            <Bar dataKey="billed" fill="#3b82f6" name="Billed">
              {chartData?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
            <Bar dataKey="collected" fill="#10b981" name="Collected" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
