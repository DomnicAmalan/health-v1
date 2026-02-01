/**
 * Radiology (RIS) Page
 * Radiology orders, exams, scheduling, and reports
 */

import { useState, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lazarus-life/ui-components";
import {
  Scan,
  Calendar,
  ClipboardList,
  FileText,
  BarChart3,
  Plus,
} from "lucide-react";
import {
  RadiologyOrderForm,
  ExamScheduler,
  RadiologyWorklist,
  ReportEditor,
  DiagnosticsDashboard,
} from "@/components/diagnostics";
import {
  useRadiologyExamTypes,
  useRadiologyRooms,
  usePendingRadiologyOrders,
  useTodayRadiologyExams,
  useInProgressRadiologyExams,
  usePendingRadiologyReports,
  useCriticalRadiologyReports,
  useRadiologyTemplates,
  useRadiologySchedule,
  useRadiologyDashboard,
  useCreateRadiologyOrder,
  useScheduleRadiologyExam,
  useStartRadiologyExam,
  useCompleteRadiologyExam,
  useCreateRadiologyReport,
  useSignRadiologyReport,
  useNotifyCriticalFinding,
} from "@/hooks/api/diagnostics";
import type { RadiologyOrder, RadiologyExam, RadiologyScheduleSlot } from "@lazarus-life/shared";

export const Route = createFileRoute("/radiology")({
  component: RadiologyPage,
});

function RadiologyPage() {
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedPatientId] = useState<string>(""); // Would come from patient context
  const [selectedOrder, setSelectedOrder] = useState<RadiologyOrder | null>(null);
  const [selectedExam, setSelectedExam] = useState<RadiologyExam | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Queries
  const { data: examTypes = [] } = useRadiologyExamTypes();
  const { data: rooms = [] } = useRadiologyRooms();
  const { data: pendingOrders = [] } = usePendingRadiologyOrders();
  const { data: todayExams = [] } = useTodayRadiologyExams();
  const { data: inProgressExams = [] } = useInProgressRadiologyExams();
  const { data: pendingReportsData = [] } = usePendingRadiologyReports();
  // Convert reports to exams for worklist - filter completed exams without reports
  const pendingReports: RadiologyExam[] = [...todayExams, ...inProgressExams].filter(
    (exam) => exam.status === "completed" && !exam.reportId
  );
  const { data: criticalFindings = [] } = useCriticalRadiologyReports();
  const { data: templates = [] } = useRadiologyTemplates();
  const today = new Date().toISOString().split("T")[0]!; // Always returns a string
  const { data: schedule } = useRadiologySchedule(today);
  const { data: radiologyDashboardStats } = useRadiologyDashboard();

  // Mutations
  const createOrderMutation = useCreateRadiologyOrder();
  const scheduleExamMutation = useScheduleRadiologyExam();
  const startExamMutation = useStartRadiologyExam();
  const completeExamMutation = useCompleteRadiologyExam();
  const createReportMutation = useCreateRadiologyReport();
  const signReportMutation = useSignRadiologyReport();
  const notifyCriticalMutation = useNotifyCriticalFinding();

  // Handlers
  const handleCreateOrder = useCallback(
    async (data: {
      patientId: string;
      orderingDoctorId: string;
      urgency: "routine" | "urgent" | "stat" | "asap";
      examTypeIds: string[];
      clinicalHistory: string;
      reasonForExam: string;
    }) => {
      // Convert examTypeIds to exams array format
      await createOrderMutation.mutateAsync({
        patientId: data.patientId,
        orderingDoctorId: data.orderingDoctorId,
        urgency: data.urgency,
        clinicalHistory: data.clinicalHistory,
        reasonForExam: data.reasonForExam,
        exams: data.examTypeIds.map(examTypeId => ({ examTypeId })),
      });
      setShowOrderForm(false);
    },
    [createOrderMutation]
  );

  const handleScheduleExam = useCallback(
    async (data: {
      orderId: string;
      examTypeId: string;
      roomId: string;
      scheduledDate: string;
      scheduledTime: string;
    }) => {
      // Convert to expected format
      await scheduleExamMutation.mutateAsync({
        orderExamId: data.orderId,
        data: {
          scheduledDate: data.scheduledDate,
          roomId: data.roomId,
        },
      });
      setSelectedOrder(null);
    },
    [scheduleExamMutation]
  );

  const handleStartExam = useCallback(
    async (examId: string) => {
      // Get current user from auth context - for now use system default
      const currentUserId = sessionStorage.getItem("userId") || "SYSTEM";
      await startExamMutation.mutateAsync({
        examId,
        data: {
          technicianId: currentUserId,
        },
      });
    },
    [startExamMutation]
  );

  const handleCompleteExam = useCallback(
    async (examId: string) => {
      // Find exam to check if contrast was required
      const exam = [...todayExams, ...inProgressExams].find((e) => e.id === examId);
      const contrastUsed = exam?.requiresContrast || false;

      await completeExamMutation.mutateAsync({
        examId,
        data: {
          contrastUsed,
        },
      });
    },
    [completeExamMutation, todayExams, inProgressExams]
  );

  const handleSaveReport = useCallback(
    async (report: {
      examId: string;
      findings: string;
      impression: string;
      recommendation?: string;
      isCritical: boolean;
      status: "draft" | "preliminary" | "final";
    }) => {
      await createReportMutation.mutateAsync({
        examId: report.examId,
        data: {
          findings: report.findings,
          impression: report.impression,
          recommendation: report.recommendation,
          isCritical: report.isCritical,
        },
      });
      setSelectedExam(null);
    },
    [createReportMutation]
  );

  const handleSignReport = useCallback(
    async (reportId: string) => {
      await signReportMutation.mutateAsync(reportId);
    },
    [signReportMutation]
  );

  const handleNotifyCritical = useCallback(
    async (reportId: string) => {
      // Find the report to get ordering doctor
      const report = criticalFindings.find((r) => r.id === reportId);
      const orderingDoctorId = report?.orderingDoctorId || "";

      await notifyCriticalMutation.mutateAsync({
        reportId,
        data: {
          notifiedTo: orderingDoctorId,
          notificationMethod: "phone",
          notes: "Critical finding notification via automated system",
        },
      });
    },
    [notifyCriticalMutation, criticalFindings]
  );

  // Build schedule map for room slots
  const scheduleMap: Record<string, RadiologyScheduleSlot[]> = {};
  if (schedule?.rooms) {
    for (const room of schedule.rooms) {
      scheduleMap[room.roomId] = room.slots;
    }
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scan className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Radiology</h1>
            <p className="text-muted-foreground">
              Radiology orders, scheduling, exams, and reports
            </p>
          </div>
        </div>
        <Button onClick={() => setShowOrderForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Radiology Order
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="scheduling" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Scheduling
          </TabsTrigger>
          <TabsTrigger value="worklist" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Worklist
          </TabsTrigger>
          <TabsTrigger value="exams" className="flex items-center gap-2">
            <Scan className="h-4 w-4" />
            Exams
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <DiagnosticsDashboard radiologyStats={radiologyDashboardStats} />
        </TabsContent>

        {/* Scheduling Tab */}
        <TabsContent value="scheduling">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Orders Pending Scheduling ({pendingOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No orders waiting to be scheduled
                </p>
              ) : (
                <div className="space-y-2">
                  {pendingOrders.map((order: RadiologyOrder) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="font-medium">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          Patient: {order.patientId} | {order.exams?.length || 1}{" "}
                          exam(s)
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Calendar className="mr-1 h-4 w-4" />
                        Schedule
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Worklist Tab */}
        <TabsContent value="worklist">
          <RadiologyWorklist
            pendingScheduling={pendingOrders}
            todayExams={todayExams}
            inProgressExams={inProgressExams}
            pendingReports={pendingReports}
            criticalFindings={criticalFindings}
            onSchedule={(orderId) => {
              const order = pendingOrders.find((o: RadiologyOrder) => o.id === orderId);
              if (order) setSelectedOrder(order);
            }}
            onStartExam={handleStartExam}
            onCompleteExam={handleCompleteExam}
            onCreateReport={(examId) => {
              const exam = [...todayExams, ...inProgressExams].find(
                (e) => e.id === examId
              );
              if (exam) setSelectedExam(exam);
            }}
            onSignReport={handleSignReport}
            onNotifyCritical={handleNotifyCritical}
            isLoading={
              startExamMutation.isPending ||
              completeExamMutation.isPending ||
              signReportMutation.isPending ||
              notifyCriticalMutation.isPending
            }
          />
        </TabsContent>

        {/* Exams Tab */}
        <TabsContent value="exams">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scan className="h-5 w-5 text-purple-600" />
                  In Progress ({inProgressExams.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {inProgressExams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No exams currently in progress
                  </p>
                ) : (
                  <div className="space-y-2">
                    {inProgressExams.map((exam: RadiologyExam) => (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between rounded-md bg-purple-50 p-3"
                      >
                        <div>
                          <p className="font-medium">{exam.examNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            Patient: {exam.patientId}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCompleteExam(exam.id)}
                          disabled={completeExamMutation.isPending}
                        >
                          Complete
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Today's Schedule ({todayExams.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayExams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No exams scheduled for today
                  </p>
                ) : (
                  <div className="space-y-2">
                    {todayExams.slice(0, 5).map((exam: RadiologyExam) => (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {exam.scheduledTime} - {exam.examNumber}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Patient: {exam.patientId}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartExam(exam.id)}
                          disabled={
                            startExamMutation.isPending ||
                            exam.status !== "scheduled"
                          }
                        >
                          Start
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pending Reports ({pendingReports.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No exams waiting for interpretation
                </p>
              ) : (
                <div className="space-y-2">
                  {pendingReports.map((exam: RadiologyExam) => (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="font-medium">{exam.examNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          Patient: {exam.patientId} | Completed:{" "}
                          {exam.completedAt
                            ? new Date(exam.completedAt).toLocaleTimeString()
                            : "-"}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setSelectedExam(exam)}
                      >
                        <FileText className="mr-1 h-4 w-4" />
                        Read
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Order Dialog */}
      <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create Radiology Order</DialogTitle>
          </DialogHeader>
          <RadiologyOrderForm
            patientId={selectedPatientId}
            examTypes={examTypes}
            onSubmit={handleCreateOrder}
            onCancel={() => setShowOrderForm(false)}
            isSubmitting={createOrderMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Scheduling Dialog */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={() => setSelectedOrder(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Schedule Exam</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <ExamScheduler
              order={selectedOrder}
              rooms={rooms}
              schedule={scheduleMap}
              onSchedule={handleScheduleExam}
              onCancel={() => setSelectedOrder(null)}
              isSubmitting={scheduleExamMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Report Editor Dialog */}
      <Dialog open={!!selectedExam} onOpenChange={() => setSelectedExam(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Report</DialogTitle>
          </DialogHeader>
          {selectedExam && (
            <ReportEditor
              exam={selectedExam}
              templates={templates}
              onSave={handleSaveReport}
              onSign={handleSignReport}
              onCancel={() => setSelectedExam(null)}
              isSubmitting={createReportMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
