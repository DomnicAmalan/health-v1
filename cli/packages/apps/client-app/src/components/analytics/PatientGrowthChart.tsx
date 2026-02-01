/**
 * Patient Growth Chart Component
 * Shows patient acquisition trends over time
 */

import { Card, CardContent, CardHeader, CardTitle } from "@lazarus-life/ui-components";
import { useCubeQuery } from '@cubejs-client/react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cubejsApi } from "@/lib/analytics/cubeClient";

export function PatientGrowthChart() {
  const { resultSet, isLoading } = useCubeQuery(
    {
      measures: ['Patients.count'],
      timeDimensions: [
        {
          dimension: 'Patients.createdAt',
          granularity: 'month',
          dateRange: 'Last 12 months',
        },
      ],
    },
    { cubejsApi }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Patient Growth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const chartData = resultSet?.chartPivot().map((item, index, array) => {
    const currentCount = item['Patients.count'] as number || 0;
    // Calculate cumulative total
    const cumulative = array
      .slice(0, index + 1)
      .reduce((sum, curr) => sum + ((curr['Patients.count'] as number) || 0), 0);

    return {
      month: new Date(item.x).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      newPatients: currentCount,
      totalPatients: cumulative,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Growth (Last 12 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              style={{ fontSize: '12px' }}
            />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }} />
            <Line
              type="monotone"
              dataKey="newPatients"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="New Patients"
            />
            <Line
              type="monotone"
              dataKey="totalPatients"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
              name="Total Patients"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
