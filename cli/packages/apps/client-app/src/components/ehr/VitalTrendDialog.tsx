/**
 * Vital Trend Dialog
 * Displays line chart visualization of vital signs over time
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lazarus-life/ui-components";
import type { EhrVitalType } from "@lazarus-life/shared/types/ehr";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { useEhrPatientVitals } from "@/hooks/api/ehr/useEhrVitals";
import { useMemo } from "react";

interface VitalTrendDialogProps {
  patientId: string;
  vitalType: EhrVitalType | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const VITAL_CONFIGS = {
  BP: {
    title: "Blood Pressure",
    unit: "mmHg",
    color: "#ef4444",
    yDomain: [60, 200],
    isSplit: true, // Systolic/Diastolic
  },
  HR: {
    title: "Heart Rate",
    unit: "bpm",
    color: "#3b82f6",
    yDomain: [40, 140],
  },
  TEMP: {
    title: "Temperature",
    unit: "°F",
    color: "#f59e0b",
    yDomain: [95, 104],
  },
  RR: {
    title: "Respiratory Rate",
    unit: "breaths/min",
    color: "#8b5cf6",
    yDomain: [8, 32],
  },
  O2SAT: {
    title: "Oxygen Saturation",
    unit: "%",
    color: "#10b981",
    yDomain: [85, 100],
  },
  WEIGHT: {
    title: "Weight",
    unit: "lbs",
    color: "#ec4899",
    yDomain: [100, 300],
  },
  HEIGHT: {
    title: "Height",
    unit: "in",
    color: "#6366f1",
    yDomain: [50, 80],
  },
  BMI: {
    title: "Body Mass Index",
    unit: "kg/m²",
    color: "#14b8a6",
    yDomain: [15, 45],
  },
  PAIN: {
    title: "Pain Scale",
    unit: "/10",
    color: "#f43f5e",
    yDomain: [0, 10],
  },
} as const;

export function VitalTrendDialog({
  patientId,
  vitalType,
  open,
  onOpenChange,
}: VitalTrendDialogProps) {
  const { data: vitals, isLoading } = useEhrPatientVitals(patientId);

  const chartData = useMemo(() => {
    if (!vitals || !vitalType) return [];

    // Filter vitals by type and sort by date
    const filtered = vitals
      .filter((v) => v.vitalType === vitalType)
      .sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime());

    // Transform for chart
    return filtered.map((vital) => {
      const date = new Date(vital.takenAt);

      if (vitalType === "BP" && vital.value.includes("/")) {
        const [systolic, diastolic] = vital.value.split("/").map(Number);
        return {
          date: format(date, "MM/dd HH:mm"),
          timestamp: date.getTime(),
          systolic,
          diastolic,
          value: systolic, // For display
        };
      }

      return {
        date: format(date, "MM/dd HH:mm"),
        timestamp: date.getTime(),
        value: parseFloat(vital.value),
      };
    });
  }, [vitals, vitalType]);

  if (!vitalType) return null;

  const config = VITAL_CONFIGS[vitalType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{config.title} Trend</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              Loading vital signs...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No {config.title.toLowerCase()} data available
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                Showing {chartData.length} measurement{chartData.length !== 1 ? "s" : ""} over time
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis
                    domain={config.yDomain}
                    tick={{ fontSize: 12 }}
                    label={{
                      value: config.unit,
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 12 },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                    }}
                    labelStyle={{ fontWeight: "bold" }}
                  />
                  <Legend />

                  {config.isSplit ? (
                    <>
                      <Line
                        type="monotone"
                        dataKey="systolic"
                        stroke="#ef4444"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Systolic"
                      />
                      <Line
                        type="monotone"
                        dataKey="diastolic"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        name="Diastolic"
                      />
                    </>
                  ) : (
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={config.color}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name={config.title}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <div className="text-xs text-muted-foreground">Latest</div>
                  <div className="text-lg font-semibold">
                    {config.isSplit
                      ? `${chartData[chartData.length - 1]?.systolic}/${chartData[chartData.length - 1]?.diastolic}`
                      : chartData[chartData.length - 1]?.value}
                    <span className="text-xs text-muted-foreground ml-1">{config.unit}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Average</div>
                  <div className="text-lg font-semibold">
                    {config.isSplit
                      ? `${Math.round(
                          chartData.reduce((sum, d) => sum + (d.systolic || 0), 0) / chartData.length
                        )}/${Math.round(
                          chartData.reduce((sum, d) => sum + (d.diastolic || 0), 0) / chartData.length
                        )}`
                      : (chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length).toFixed(1)}
                    <span className="text-xs text-muted-foreground ml-1">{config.unit}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Range</div>
                  <div className="text-lg font-semibold">
                    {config.isSplit
                      ? `${Math.min(...chartData.map((d) => d.systolic || 0))}/${Math.min(
                          ...chartData.map((d) => d.diastolic || 0)
                        )} - ${Math.max(...chartData.map((d) => d.systolic || 0))}/${Math.max(
                          ...chartData.map((d) => d.diastolic || 0)
                        )}`
                      : `${Math.min(...chartData.map((d) => d.value))} - ${Math.max(
                          ...chartData.map((d) => d.value)
                        )}`}
                    <span className="text-xs text-muted-foreground ml-1">{config.unit}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
