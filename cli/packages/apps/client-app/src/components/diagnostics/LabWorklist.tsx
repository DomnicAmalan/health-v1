/**
 * Lab Worklist Component
 * Displays lab samples and results for processing
 */

import { memo, useState } from "react";
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lazarus-life/ui-components";
import {
  FlaskConical,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  Eye,
} from "lucide-react";
import type { Sample, LabResult, Priority, SampleStatus } from "@lazarus-life/shared";

interface LabWorklistProps {
  pendingProcessing: Sample[];
  pendingVerification: LabResult[];
  criticalResults: LabResult[];
  onStartProcessing: (sampleId: string) => void;
  onVerifyResult: (resultId: string) => void;
  onViewResult: (resultId: string) => void;
  onNotifyCritical: (resultId: string) => void;
  isLoading?: boolean;
}

const priorityColors: Record<Priority, string> = {
  routine: "bg-slate-100 text-slate-700",
  urgent: "bg-amber-100 text-amber-700",
  stat: "bg-red-100 text-red-700",
};

const statusColors: Record<SampleStatus, string> = {
  pending_collection: "bg-yellow-100 text-yellow-700",
  collected: "bg-blue-100 text-blue-700",
  received: "bg-green-100 text-green-700",
  processing: "bg-purple-100 text-purple-700",
  analyzed: "bg-cyan-100 text-cyan-700",
  verified: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-700",
};

export const LabWorklist = memo(function LabWorklist({
  pendingProcessing,
  pendingVerification,
  criticalResults,
  onStartProcessing,
  onVerifyResult,
  onViewResult,
  onNotifyCritical,
  isLoading = false,
}: LabWorklistProps) {
  const [activeTab, setActiveTab] = useState("processing");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="processing" className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4" />
          Processing ({pendingProcessing.length})
        </TabsTrigger>
        <TabsTrigger value="verification" className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Verification ({pendingVerification.length})
        </TabsTrigger>
        <TabsTrigger value="critical" className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Critical ({criticalResults.length})
        </TabsTrigger>
      </TabsList>

      {/* Processing Queue */}
      <TabsContent value="processing">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              Samples Pending Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingProcessing.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No samples waiting for processing
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sample #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tests</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingProcessing.map((sample) => (
                    <TableRow key={sample.id}>
                      <TableCell className="font-medium">
                        {sample.sampleNumber}
                      </TableCell>
                      <TableCell>{sample.patientId}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{sample.sampleType}</Badge>
                      </TableCell>
                      <TableCell>{sample.tests?.length || 0}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            priorityColors[sample.priority || "routine"]
                          }
                        >
                          {sample.priority || "routine"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {sample.receivedAt
                          ? new Date(sample.receivedAt).toLocaleTimeString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => onStartProcessing(sample.id)}
                          disabled={isLoading}
                        >
                          <Play className="mr-1 h-4 w-4" />
                          Start
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Verification Queue */}
      <TabsContent value="verification">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Results Pending Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingVerification.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No results waiting for verification
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Result #</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Flag</TableHead>
                    <TableHead>Entered By</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingVerification.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">
                        {result.resultNumber}
                      </TableCell>
                      <TableCell>{result.testId}</TableCell>
                      <TableCell>
                        {result.value} {result.unit}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            result.flag?.includes("critical")
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {result.flag || "normal"}
                        </Badge>
                      </TableCell>
                      <TableCell>{result.enteredBy || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onViewResult(result.id)}
                          >
                            <Eye className="mr-1 h-4 w-4" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => onVerifyResult(result.id)}
                            disabled={isLoading}
                          >
                            <CheckCircle className="mr-1 h-4 w-4" />
                            Verify
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Critical Results */}
      <TabsContent value="critical">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Critical Results - Immediate Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            {criticalResults.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No critical results pending notification
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Result #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Flag</TableHead>
                    <TableHead>Notified</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalResults.map((result) => (
                    <TableRow key={result.id} className="bg-red-50">
                      <TableCell className="font-medium">
                        {result.resultNumber}
                      </TableCell>
                      <TableCell>{result.patientId}</TableCell>
                      <TableCell>{result.testId}</TableCell>
                      <TableCell className="font-bold text-red-600">
                        {result.value} {result.unit}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          {result.flag?.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {result.criticalNotifiedAt ? (
                          <span className="text-green-600">
                            {new Date(
                              result.criticalNotifiedAt
                            ).toLocaleTimeString()}
                          </span>
                        ) : (
                          <span className="text-red-600">Not yet</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {!result.criticalNotifiedAt && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onNotifyCritical(result.id)}
                            disabled={isLoading}
                          >
                            <AlertTriangle className="mr-1 h-4 w-4" />
                            Notify
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
});
