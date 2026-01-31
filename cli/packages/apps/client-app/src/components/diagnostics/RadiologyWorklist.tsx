/**
 * Radiology Worklist Component
 * Worklists for different radiology workflows
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
  Calendar,
  Play,
  CheckCircle,
  FileText,
  AlertTriangle,
  Clock,
  Scan,
} from "lucide-react";
import type {
  RadiologyOrder,
  RadiologyExam,
  RadiologyReport,
  Urgency,
  ExamStatus,
} from "@lazarus-life/shared";

interface RadiologyWorklistProps {
  // Scheduling worklist
  pendingScheduling: RadiologyOrder[];
  // Technician worklist
  todayExams: RadiologyExam[];
  inProgressExams: RadiologyExam[];
  // Radiologist worklist
  pendingReports: RadiologyExam[];
  criticalFindings: RadiologyReport[];
  // Actions
  onSchedule: (orderId: string) => void;
  onStartExam: (examId: string) => void;
  onCompleteExam: (examId: string) => void;
  onCreateReport: (examId: string) => void;
  onSignReport: (reportId: string) => void;
  onNotifyCritical: (reportId: string) => void;
  isLoading?: boolean;
}

const urgencyColors: Record<Urgency, string> = {
  routine: "bg-slate-100 text-slate-700",
  urgent: "bg-amber-100 text-amber-700",
  stat: "bg-red-100 text-red-700",
  asap: "bg-orange-100 text-orange-700",
};

const statusColors: Record<ExamStatus, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  checked_in: "bg-cyan-100 text-cyan-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  reported: "bg-emerald-100 text-emerald-700",
  verified: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-700",
};

export const RadiologyWorklist = memo(function RadiologyWorklist({
  pendingScheduling,
  todayExams,
  inProgressExams,
  pendingReports,
  criticalFindings,
  onSchedule,
  onStartExam,
  onCompleteExam,
  onCreateReport,
  onSignReport,
  onNotifyCritical,
  isLoading = false,
}: RadiologyWorklistProps) {
  const [activeTab, setActiveTab] = useState("scheduling");

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        <TabsTrigger value="scheduling" className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Scheduling ({pendingScheduling.length})
        </TabsTrigger>
        <TabsTrigger value="technician" className="flex items-center gap-2">
          <Scan className="h-4 w-4" />
          Technician ({todayExams.length + inProgressExams.length})
        </TabsTrigger>
        <TabsTrigger value="radiologist" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Reading ({pendingReports.length})
        </TabsTrigger>
        <TabsTrigger value="critical" className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          Critical ({criticalFindings.length})
        </TabsTrigger>
      </TabsList>

      {/* Scheduling Worklist */}
      <TabsContent value="scheduling">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Orders Pending Scheduling
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingScheduling.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No orders waiting to be scheduled
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Exam(s)</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Ordered</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingScheduling.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.orderNumber}
                      </TableCell>
                      <TableCell>{order.patientId}</TableCell>
                      <TableCell>{order.exams?.length || 1} exam(s)</TableCell>
                      <TableCell>
                        <Badge className={urgencyColors[order.urgency]}>
                          {order.urgency}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => onSchedule(order.id)}
                          disabled={isLoading}
                        >
                          <Calendar className="mr-1 h-4 w-4" />
                          Schedule
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

      {/* Technician Worklist */}
      <TabsContent value="technician" className="space-y-4">
        {/* In Progress */}
        <Card className="border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-600">
              <Play className="h-5 w-5" />
              In Progress ({inProgressExams.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {inProgressExams.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No exams currently in progress
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inProgressExams.map((exam) => (
                    <TableRow key={exam.id} className="bg-purple-50">
                      <TableCell className="font-medium">
                        {exam.examNumber}
                      </TableCell>
                      <TableCell>{exam.patientId}</TableCell>
                      <TableCell>{exam.examTypeId}</TableCell>
                      <TableCell>{exam.roomId || "-"}</TableCell>
                      <TableCell>
                        {exam.startedAt
                          ? new Date(exam.startedAt).toLocaleTimeString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => onCompleteExam(exam.id)}
                          disabled={isLoading}
                        >
                          <CheckCircle className="mr-1 h-4 w-4" />
                          Complete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Schedule ({todayExams.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayExams.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No exams scheduled for today
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayExams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">
                        {exam.scheduledTime || "-"}
                      </TableCell>
                      <TableCell>{exam.patientId}</TableCell>
                      <TableCell>{exam.examTypeId}</TableCell>
                      <TableCell>{exam.roomId || "-"}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[exam.status]}>
                          {exam.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {exam.status === "scheduled" ||
                        exam.status === "checked_in" ? (
                          <Button
                            size="sm"
                            onClick={() => onStartExam(exam.id)}
                            disabled={isLoading}
                          >
                            <Play className="mr-1 h-4 w-4" />
                            Start
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Radiologist Worklist */}
      <TabsContent value="radiologist">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Exams Pending Reading
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingReports.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No exams waiting for interpretation
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Exam Type</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReports.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell className="font-medium">
                        {exam.examNumber}
                      </TableCell>
                      <TableCell>{exam.patientId}</TableCell>
                      <TableCell>{exam.examTypeId}</TableCell>
                      <TableCell>
                        {exam.completedAt
                          ? new Date(exam.completedAt).toLocaleTimeString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={urgencyColors[exam.urgency || "routine"]}
                        >
                          {exam.urgency || "routine"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => onCreateReport(exam.id)}
                          disabled={isLoading}
                        >
                          <FileText className="mr-1 h-4 w-4" />
                          Read
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

      {/* Critical Findings */}
      <TabsContent value="critical">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Critical Findings - Immediate Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            {criticalFindings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No critical findings pending notification
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report #</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Finding</TableHead>
                    <TableHead>Radiologist</TableHead>
                    <TableHead>Notified</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {criticalFindings.map((report) => (
                    <TableRow key={report.id} className="bg-red-50">
                      <TableCell className="font-medium">
                        {report.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>{report.examId}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {report.impression || report.findings}
                      </TableCell>
                      <TableCell>{report.signedBy || "-"}</TableCell>
                      <TableCell>
                        {report.criticalNotifiedAt ? (
                          <span className="text-green-600">
                            {new Date(
                              report.criticalNotifiedAt
                            ).toLocaleTimeString()}
                          </span>
                        ) : (
                          <span className="font-medium text-red-600">
                            Not yet
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onSignReport(report.id)}
                            disabled={isLoading || !!report.signedAt}
                          >
                            {report.signedAt ? "Signed" : "Sign"}
                          </Button>
                          {!report.criticalNotifiedAt && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onNotifyCritical(report.id)}
                              disabled={isLoading}
                            >
                              <AlertTriangle className="mr-1 h-4 w-4" />
                              Notify
                            </Button>
                          )}
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
    </Tabs>
  );
});
