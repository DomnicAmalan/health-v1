/**
 * Visit Trend Chart Component
 * Shows clinical visit trends by type using Cube.js + Recharts
 */

import { Card, CardContent, CardHeader, CardTitle } from "@lazarus-life/ui-components";
import { useCubeQuery } from '@cubejs-client/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cubejsApi } from "@/lib/analytics/cubeClient";

export function VisitTrendChart() {
  const { resultSet, isLoading } = useCubeQuery(
    {
      measures: ['Clinical.visitCount'],
      dimensions: ['Clinical.visitType'],
      timeDimensions: [
        {
          dimension: 'Clinical.visitDate',
          granularity: 'day',
          dateRange: 'Last 14 days',
        },
      ],
    },
    { cubejsApi }
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Visit Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  // Transform data for stacked bar chart
  const pivotConfig = {
    x: ['Clinical.visitDate.day'],
    y: ['Clinical.visitType', 'measures'],
  };

  const chartData = resultSet?.chartPivot(pivotConfig).map((item) => {
    const date = new Date(item.x).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const result: Record<string, string | number> = { date };

    // Add each visit type as a separate key
    Object.keys(item).forEach(key => {
      if (key !== 'x' && key !== 'xValues') {
        const visitType = key.replace('Clinical.visitCount,Clinical.visitType:', '').replace(',', ' ');
        result[visitType] = item[key] as number;
      }
    });

    return result;
  });

  // Extract visit types for legend
  const visitTypes = resultSet?.chartPivot(pivotConfig)[0]
    ? Object.keys(resultSet.chartPivot(pivotConfig)[0]).filter(k => k !== 'x' && k !== 'xValues')
    : [];

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visit Volume by Type (Last 14 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              style={{ fontSize: '12px' }}
            />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }} />
            <Legend />
            {visitTypes.map((type, index) => {
              const cleanType = type.replace('Clinical.visitCount,Clinical.visitType:', '').replace(',', ' ');
              return (
                <Bar
                  key={type}
                  dataKey={cleanType}
                  stackId="visits"
                  fill={colors[index % colors.length]}
                  name={cleanType}
                />
              );
            })}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
