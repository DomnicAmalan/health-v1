/**
 * Department Breakdown Component
 * Shows visit distribution by department using Cube.js + Recharts
 */

import { Card, CardContent, CardHeader, CardTitle } from "@lazarus-life/ui-components";
import { useCubeQuery } from '@cubejs-client/react';
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { cubejsApi } from "@/lib/analytics/cubeClient";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

export function DepartmentBreakdown() {
  const { resultSet, isLoading } = useCubeQuery(
    {
      measures: ['Clinical.visitCount'],
      dimensions: ['Clinical.department'],
      timeDimensions: [
        {
          dimension: 'Clinical.visitDate',
          dateRange: 'This month',
        },
      ],
      order: {
        'Clinical.visitCount': 'desc',
      },
    },
    { cubejsApi }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Department Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const chartData = resultSet?.tablePivot().map((item) => ({
    name: item['Clinical.department'] as string || 'Unknown',
    value: item['Clinical.visitCount'] as number || 0,
  }));

  const totalVisits = chartData?.reduce((sum, item) => sum + item.value, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          {totalVisits} total visits this month
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData?.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => `${value} visits`} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
