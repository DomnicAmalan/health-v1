/**
 * Lab Order Form Component
 * Form for creating laboratory test orders
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
  Checkbox,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@lazarus-life/ui-components";
import { Search, Plus, X, FlaskConical } from "lucide-react";
import type { LabTest, TestPanel, Priority } from "@lazarus-life/shared";

interface LabOrderFormProps {
  patientId: string;
  tests: LabTest[];
  panels: TestPanel[];
  onSubmit: (data: {
    patientId: string;
    orderingDoctorId: string;
    priority: Priority;
    testIds: string[];
    clinicalNotes?: string;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const LabOrderForm = memo(function LabOrderForm({
  patientId,
  tests,
  panels,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: LabOrderFormProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(
    new Set()
  );
  const [priority, setPriority] = useState<Priority>("routine");
  const [clinicalNotes, setClinicalNotes] = useState("");

  const filteredTests = tests.filter(
    (test) =>
      test.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.testCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      test.loincCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPanels = panels.filter(
    (panel) =>
      panel.panelName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      panel.panelCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTestToggle = useCallback((testId: string) => {
    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      if (next.has(testId)) {
        next.delete(testId);
      } else {
        next.add(testId);
      }
      return next;
    });
  }, []);

  const handlePanelSelect = useCallback(
    (panel: TestPanel) => {
      setSelectedTestIds((prev) => {
        const next = new Set(prev);
        const testIds = panel.testIds || panel.tests.map(t => t.id);
        for (const testId of testIds) {
          next.add(testId);
        }
        return next;
      });
    },
    []
  );

  const handleRemoveTest = useCallback((testId: string) => {
    setSelectedTestIds((prev) => {
      const next = new Set(prev);
      next.delete(testId);
      return next;
    });
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedTestIds.size === 0) return;

      onSubmit({
        patientId,
        orderingDoctorId: "", // Would come from auth context
        priority,
        testIds: Array.from(selectedTestIds),
        clinicalNotes: clinicalNotes || undefined,
      });
    },
    [patientId, selectedTestIds, priority, clinicalNotes, onSubmit]
  );

  const selectedTests = tests.filter((t) => selectedTestIds.has(t.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Test Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FlaskConical className="h-5 w-5" />
              Available Tests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tests by name, code, or LOINC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Test Panels */}
            {filteredPanels.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Test Panels</Label>
                <div className="flex flex-wrap gap-2">
                  {filteredPanels.map((panel) => (
                    <Button
                      key={panel.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handlePanelSelect(panel)}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      {panel.panelName} ({(panel.testIds || panel.tests).length} tests)
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Individual Tests */}
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {filteredTests.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedTestIds.has(test.id)}
                      onCheckedChange={() => handleTestToggle(test.id)}
                    />
                    <div>
                      <div className="font-medium">{test.testName}</div>
                      <div className="text-sm text-muted-foreground">
                        {test.testCode}
                        {test.loincCode && ` • LOINC: ${test.loincCode}`}
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">{test.category}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Selected Tests & Order Details */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Selected Tests ({selectedTests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTests.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tests selected. Search and select tests from the left
                  panel.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedTests.map((test) => (
                    <div
                      key={test.id}
                      className="flex items-center justify-between rounded-md bg-muted p-2"
                    >
                      <div>
                        <div className="font-medium">{test.testName}</div>
                        <div className="text-sm text-muted-foreground">
                          Sample: {test.sampleType}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTest(test.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={priority}
                  onValueChange={(v) => setPriority(v as Priority)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="stat">STAT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Clinical Notes</Label>
                <Input
                  id="notes"
                  placeholder="Add clinical notes or special instructions..."
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={selectedTestIds.size === 0 || isSubmitting}
        >
          {isSubmitting ? "Creating Order..." : "Create Lab Order"}
        </Button>
      </div>
    </form>
  );
});
