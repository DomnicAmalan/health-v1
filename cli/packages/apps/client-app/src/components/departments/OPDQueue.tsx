/**
 * OPDQueue Component
 * OPD queue management with real-time patient tracking
 */

import { memo, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Skeleton,
  Alert,
  AlertDescription,
} from "@lazarus-life/ui-components";
import {
  useOPDQueue,
  useWaitingQueue,
  useOPDDashboard,
  useCallNextPatient,
  useUpdateQueueStatus,
  useCancelQueueEntry,
} from "@/hooks/api/departments";
import type {
  OPDQueueEntry,
  OPDQueueSummary,
  QueueStatus,
  QueuePriority,
} from "@lazarus-life/shared/types/departments";

const statusLabels: Record<QueueStatus, string> = {
  waiting: "Waiting",
  called: "Called",
  in_consultation: "In Consultation",
  completed: "Completed",
  no_show: "No Show",
  cancelled: "Cancelled",
  referred: "Referred",
  skipped: "Skipped",
};

const statusColors: Record<QueueStatus, "default" | "secondary" | "destructive" | "outline"> = {
  waiting: "outline",
  called: "default",
  in_consultation: "secondary",
  completed: "default",
  no_show: "destructive",
  cancelled: "destructive",
  referred: "secondary",
  skipped: "outline",
};

const priorityColors: Record<QueuePriority, string> = {
  normal: "bg-gray-100 text-gray-800",
  priority: "bg-blue-100 text-blue-800",
  urgent: "bg-orange-100 text-orange-800",
  emergency: "bg-red-100 text-red-800",
};

interface QueueEntryRowProps {
  entry: OPDQueueSummary;
  onCall: (entry: OPDQueueSummary) => void;
  onComplete: (entry: OPDQueueSummary) => void;
  onCancel: (entry: OPDQueueSummary) => void;
}

const QueueEntryRow = memo(function QueueEntryRow({
  entry,
  onCall,
  onComplete,
  onCancel,
}: QueueEntryRowProps) {
  const waitTime = entry.waitTime || 0;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${priorityColors[entry.priority]}`}
          >
            {entry.tokenNumber}
          </div>
          <div>
            <p className="font-medium">{entry.patientName}</p>
            <p className="text-sm text-muted-foreground">
              {entry.patientId.slice(0, 8)}...
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={statusColors[entry.status]}>
          {statusLabels[entry.status]}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={priorityColors[entry.priority]}>
          {entry.priority.charAt(0).toUpperCase() + entry.priority.slice(1)}
        </Badge>
      </TableCell>
      <TableCell>
        <div>
          <p className="font-medium">{entry.doctorName ?? "Not assigned"}</p>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <p>
            {entry.registrationTime
              ? new Date(entry.registrationTime).toLocaleTimeString()
              : "-"}
          </p>
          <p className="text-muted-foreground">
            {waitTime > 0 ? `${waitTime} min wait` : "-"}
          </p>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {entry.status === "waiting" && (
            <Button size="sm" onClick={() => onCall(entry)}>
              Call
            </Button>
          )}
          {entry.status === "called" && (
            <Button size="sm" variant="secondary" onClick={() => onCall(entry)}>
              Start
            </Button>
          )}
          {entry.status === "in_consultation" && (
            <Button size="sm" variant="default" onClick={() => onComplete(entry)}>
              Complete
            </Button>
          )}
          {(entry.status === "waiting" || entry.status === "called") && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCancel(entry)}
            >
              Cancel
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
});

interface OPDQueueProps {
  doctorId?: string;
  departmentId?: string;
}

export const OPDQueue = memo(function OPDQueue({
  doctorId,
  departmentId,
}: OPDQueueProps) {
  const [statusFilter, setStatusFilter] = useState<QueueStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<QueuePriority | "all">("all");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [entryToCancel, setEntryToCancel] = useState<OPDQueueSummary | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  const { data: queueData, isLoading } = useOPDQueue({
    status: statusFilter === "all" ? undefined : statusFilter,
    priority: priorityFilter === "all" ? undefined : priorityFilter,
    doctorId,
    departmentId,
  });
  const { data: dashboardData } = useOPDDashboard();

  const callNextMutation = useCallNextPatient();
  const updateStatusMutation = useUpdateQueueStatus();
  const cancelMutation = useCancelQueueEntry();

  const handleCall = useCallback(
    async (entry: OPDQueueSummary) => {
      if (entry.status === "waiting") {
        await updateStatusMutation.mutateAsync({
          queueId: entry.id,
          data: { status: "called" },
        });
      } else if (entry.status === "called") {
        await updateStatusMutation.mutateAsync({
          queueId: entry.id,
          data: { status: "in_consultation" },
        });
      }
    },
    [updateStatusMutation]
  );

  const handleComplete = useCallback(
    async (entry: OPDQueueSummary) => {
      await updateStatusMutation.mutateAsync({
        queueId: entry.id,
        data: { status: "completed" },
      });
    },
    [updateStatusMutation]
  );

  const handleCancelClick = useCallback((entry: OPDQueueSummary) => {
    setEntryToCancel(entry);
    setCancelDialogOpen(true);
  }, []);

  const handleConfirmCancel = useCallback(async () => {
    if (entryToCancel) {
      await cancelMutation.mutateAsync({
        queueId: entryToCancel.id,
        reason: cancelReason,
      });
      setCancelDialogOpen(false);
      setEntryToCancel(null);
      setCancelReason("");
    }
  }, [entryToCancel, cancelReason, cancelMutation]);

  const handleCallNext = useCallback(async () => {
    await callNextMutation.mutateAsync({
      doctorId: doctorId || "",
      roomNumber: undefined,
    });
  }, [callNextMutation, doctorId]);

  const queue = queueData?.queue ?? [];
  const stats = dashboardData?.today;

  return (
    <div className="space-y-6">
      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats?.totalRegistered ?? 0}</div>
            <p className="text-sm text-muted-foreground">Total Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.waiting ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Waiting</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">
              {stats?.inConsultation ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">In Consultation</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {stats?.completed ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {stats?.averageWaitTime ?? 0} min
            </div>
            <p className="text-sm text-muted-foreground">Avg Wait Time</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as QueueStatus | "all")}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="waiting">Waiting</SelectItem>
              <SelectItem value="called">Called</SelectItem>
              <SelectItem value="in_consultation">In Consultation</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={priorityFilter}
            onValueChange={(v) => setPriorityFilter(v as QueuePriority | "all")}
          >
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleCallNext} disabled={callNextMutation.isPending}>
            Call Next Patient
          </Button>
          <Button variant="outline">Check In Patient</Button>
        </div>
      </div>

      {/* Queue Table */}
      <Card>
        <CardHeader>
          <CardTitle>Patient Queue</CardTitle>
          <CardDescription>
            {queue.length} patient{queue.length !== 1 ? "s" : ""} in queue
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`queue-skeleton-${i}`} className="h-16 w-full" />
              ))}
            </div>
          ) : queue.length === 0 ? (
            <Alert>
              <AlertDescription>
                No patients in the queue matching the selected filters.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((entry) => (
                  <QueueEntryRow
                    key={entry.id}
                    entry={entry}
                    onCall={handleCall}
                    onComplete={handleComplete}
                    onCancel={handleCancelClick}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Queue Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this patient's queue entry?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Reason (optional)</label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancellation reason..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
              Keep in Queue
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={cancelMutation.isPending}
            >
              Cancel Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default OPDQueue;
