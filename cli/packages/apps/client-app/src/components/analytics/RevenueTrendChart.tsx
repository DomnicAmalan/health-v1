/**
 * Revenue Trend Chart Component
 * Shows revenue trends over time using Cube.js + Recharts
 */

import { Card, CardContent, CardHeader, CardTitle } from "@lazarus-life/ui-components";
import { useCubeQuery } from '@cubejs-client/react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cubejsApi, formatCurrency } from "@/lib/analytics/cubeClient";

export function RevenueTrendChart() {
  const { resultSet, isLoading } = useCubeQuery(
    {
      measures: ['Revenue.totalRevenue', 'Revenue.collectedRevenue'],
      timeDimensions: [
        {
          dimension: 'Revenue.createdAt',
          granularity: 'day',
          dateRange: 'Last 30 days',
        },
      ],
    },
    { cubejsApi }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const chartData = resultSet?.chartPivot().map((item) => ({
    date: new Date(item.x).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    billed: item['Revenue.totalRevenue'] || 0,
    collected: item['Revenue.collectedRevenue'] || 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Trend (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              style={{ fontSize: '12px' }}
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
            <Area
              type="monotone"
              dataKey="billed"
              stroke="#3b82f6"
              fillOpacity={1}
              fill="url(#colorBilled)"
              name="Billed"
            />
            <Area
              type="monotone"
              dataKey="collected"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#colorCollected)"
              name="Collected"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
