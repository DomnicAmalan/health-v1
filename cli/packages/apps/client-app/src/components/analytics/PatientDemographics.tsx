/**
 * Patient Demographics Component
 * Shows patient distribution by age, gender, and insurance
 */

import { Card, CardContent, CardHeader, CardTitle } from "@lazarus-life/ui-components";
import { useCubeQuery } from '@cubejs-client/react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cubejsApi } from "@/lib/analytics/cubeClient";

const GENDER_COLORS = {
  Male: '#3b82f6',
  Female: '#ec4899',
  Other: '#8b5cf6',
  'Not Specified': '#6b7280',
};

const AGE_GROUP_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

export function PatientDemographics() {
  // Gender distribution
  const { resultSet: genderData, isLoading: loadingGender } = useCubeQuery(
    {
      measures: ['Patients.count'],
      dimensions: ['Patients.gender'],
    },
    { cubejsApi }
  );

  // Age group distribution from Clinical data
  const { resultSet: ageData, isLoading: loadingAge } = useCubeQuery(
    {
      measures: ['Clinical.patientCount'],
      dimensions: ['Clinical.ageGroup'],
    },
    { cubejsApi }
  );

  // Insurance provider breakdown
  const { resultSet: insuranceData, isLoading: loadingInsurance } = useCubeQuery(
    {
      measures: ['Patients.count'],
      dimensions: ['Patients.insuranceProvider'],
      order: {
        'Patients.count': 'desc',
      },
      limit: 5,
    },
    { cubejsApi }
  );

  const genderChartData = genderData?.tablePivot().map((item) => ({
    name: (item['Patients.gender'] as string) || 'Not Specified',
    value: item['Patients.count'] as number || 0,
  }));

  const ageChartData = ageData?.tablePivot().map((item) => ({
    name: item['Clinical.ageGroup'] as string || 'Unknown',
    value: item['Clinical.patientCount'] as number || 0,
  }));

  const insuranceChartData = insuranceData?.tablePivot().map((item) => ({
    name: (item['Patients.insuranceProvider'] as string) || 'Self-Pay',
    count: item['Patients.count'] as number || 0,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Gender Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Gender Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingGender ? (
            <div className="h-[250px] bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={genderChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderChartData?.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={GENDER_COLORS[entry.name as keyof typeof GENDER_COLORS] || '#6b7280'}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Age Group Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Age Groups</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingAge ? (
            <div className="h-[250px] bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ageChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Bar dataKey="value" name="Patients">
                  {ageChartData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={AGE_GROUP_COLORS[index % AGE_GROUP_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top Insurance Providers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Insurance Providers</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingInsurance ? (
            <div className="h-[250px] bg-muted animate-pulse rounded" />
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={insuranceChartData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" style={{ fontSize: '12px' }} />
                <YAxis dataKey="name" type="category" width={100} style={{ fontSize: '11px' }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
