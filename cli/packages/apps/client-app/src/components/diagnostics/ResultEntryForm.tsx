/**
 * Result Entry Form Component
 * Form for entering laboratory test results
 */

import { memo, useCallback, useState } from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@lazarus-life/ui-components";
import { AlertTriangle, CheckCircle, ArrowUp, ArrowDown } from "lucide-react";
import type { LabTest, ResultFlag, ReferenceRange } from "@lazarus-life/shared";

interface TestResult {
  testId: string;
  value: string;
  numericValue?: number;
  flag?: ResultFlag;
  comments?: string;
}

interface ResultEntryFormProps {
  sampleId: string;
  tests: Array<LabTest & { referenceRanges?: ReferenceRange[] }>;
  onSubmit: (results: TestResult[]) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const flagColors: Record<ResultFlag, string> = {
  normal: "bg-green-100 text-green-700",
  low: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical_low: "bg-red-100 text-red-700",
  critical_high: "bg-red-100 text-red-700",
  abnormal: "bg-purple-100 text-purple-700",
  positive: "bg-amber-100 text-amber-700",
  negative: "bg-green-100 text-green-700",
};

const flagIcons: Record<ResultFlag, React.ReactNode> = {
  normal: <CheckCircle className="h-4 w-4" />,
  low: <ArrowDown className="h-4 w-4" />,
  high: <ArrowUp className="h-4 w-4" />,
  critical_low: <AlertTriangle className="h-4 w-4" />,
  critical_high: <AlertTriangle className="h-4 w-4" />,
  abnormal: <AlertTriangle className="h-4 w-4" />,
  positive: <AlertTriangle className="h-4 w-4" />,
  negative: <CheckCircle className="h-4 w-4" />,
};

export const ResultEntryForm = memo(function ResultEntryForm({
  sampleId,
  tests,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ResultEntryFormProps) {
  const [results, setResults] = useState<Map<string, TestResult>>(new Map());

  const calculateFlag = useCallback(
    (testId: string, numericValue: number): ResultFlag => {
      const test = tests.find((t) => t.id === testId);
      if (!test?.referenceRanges?.length) return "normal";

      const range = test.referenceRanges[0]; // Use first matching range
      if (!range) return "normal";

      if (range.criticalLow && numericValue < range.criticalLow) {
        return "critical_low";
      }
      if (range.criticalHigh && numericValue > range.criticalHigh) {
        return "critical_high";
      }
      if (range.lowValue && numericValue < range.lowValue) {
        return "low";
      }
      if (range.highValue && numericValue > range.highValue) {
        return "high";
      }
      return "normal";
    },
    [tests]
  );

  const handleValueChange = useCallback(
    (testId: string, value: string) => {
      setResults((prev) => {
        const next = new Map(prev);
        const numericValue = parseFloat(value);
        const flag = !isNaN(numericValue)
          ? calculateFlag(testId, numericValue)
          : undefined;

        next.set(testId, {
          testId,
          value,
          numericValue: !isNaN(numericValue) ? numericValue : undefined,
          flag,
        });
        return next;
      });
    },
    [calculateFlag]
  );

  const handleFlagChange = useCallback((testId: string, flag: ResultFlag) => {
    setResults((prev) => {
      const next = new Map(prev);
      const existing = next.get(testId);
      if (existing) {
        next.set(testId, { ...existing, flag });
      }
      return next;
    });
  }, []);

  const handleCommentsChange = useCallback(
    (testId: string, comments: string) => {
      setResults((prev) => {
        const next = new Map(prev);
        const existing = next.get(testId);
        if (existing) {
          next.set(testId, { ...existing, comments });
        }
        return next;
      });
    },
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (results.size === 0) return;
      onSubmit(Array.from(results.values()));
    },
    [results, onSubmit]
  );

  const hasCriticalResults = Array.from(results.values()).some(
    (r) => r.flag === "critical_low" || r.flag === "critical_high"
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {hasCriticalResults && (
        <div className="flex items-center gap-2 rounded-md border-l-4 border-red-500 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <span className="font-medium text-red-700">
            Critical values detected! Results will require immediate
            notification.
          </span>
        </div>
      )}

      <div className="space-y-4">
        {tests.map((test) => {
          const result = results.get(test.id);
          const range = test.referenceRanges?.[0];

          return (
            <Card key={test.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{test.testName}</CardTitle>
                  <Badge variant="outline">{test.testCode}</Badge>
                </div>
                {range && (
                  <p className="text-sm text-muted-foreground">
                    Reference: {range.lowValue} - {range.highValue} {test.unit}
                    {range.criticalLow && (
                      <span className="text-red-600">
                        {" "}
                        (Critical: &lt;{range.criticalLow})
                      </span>
                    )}
                    {range.criticalHigh && (
                      <span className="text-red-600">
                        {" "}
                        (Critical: &gt;{range.criticalHigh})
                      </span>
                    )}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor={`value-${test.id}`}>Result Value</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id={`value-${test.id}`}
                        placeholder="Enter result..."
                        value={result?.value || ""}
                        onChange={(e) =>
                          handleValueChange(test.id, e.target.value)
                        }
                      />
                      {test.unit && (
                        <span className="text-sm text-muted-foreground">
                          {test.unit}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`flag-${test.id}`}>Flag</Label>
                    <Select
                      value={result?.flag || "normal"}
                      onValueChange={(v) =>
                        handleFlagChange(test.id, v as ResultFlag)
                      }
                    >
                      <SelectTrigger id={`flag-${test.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical_low">
                          Critical Low
                        </SelectItem>
                        <SelectItem value="critical_high">
                          Critical High
                        </SelectItem>
                        <SelectItem value="abnormal">Abnormal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    {result?.flag && (
                      <Badge className={flagColors[result.flag]}>
                        <span className="mr-1">{flagIcons[result.flag]}</span>
                        {result.flag.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`comments-${test.id}`}>Comments</Label>
                  <Input
                    id={`comments-${test.id}`}
                    placeholder="Optional comments..."
                    value={result?.comments || ""}
                    onChange={(e) =>
                      handleCommentsChange(test.id, e.target.value)
                    }
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={results.size === 0 || isSubmitting}
          variant={hasCriticalResults ? "destructive" : "default"}
        >
          {isSubmitting ? "Saving Results..." : "Save Results"}
        </Button>
      </div>
    </form>
  );
});
