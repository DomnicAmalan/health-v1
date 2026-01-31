/**
 * PrescriptionList Component
 * Displays prescriptions with workflow actions for pharmacists
 */

import type {
  Prescription,
  PrescriptionStatus,
  DispensingStatus,
} from "@lazarus-life/shared/types/ehr";
import {
  Box,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Package,
  Pill,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { memo } from "react";
import {
  usePrescriptions,
  usePendingPrescriptions,
  useReadyPrescriptions,
  usePatientPrescriptions,
  useVerifyPrescription,
  useDispensePrescription,
  useCancelPrescription,
} from "@/hooks/api/pharmacy";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className || ""}`} />
);

interface PrescriptionListProps {
  patientId?: string;
  mode?: "all" | "pending" | "ready" | "patient";
  currentUserId?: number;
  onSelectPrescription?: (prescription: Prescription) => void;
  compact?: boolean;
  className?: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function PrescriptionStatusBadge({ status }: { status: PrescriptionStatus }) {
  const config: Record<
    PrescriptionStatus,
    { variant: "default" | "secondary" | "destructive" | "outline"; label: string }
  > = {
    active: { variant: "default", label: "Active" },
    discontinued: { variant: "destructive", label: "Discontinued" },
    expired: { variant: "secondary", label: "Expired" },
    on_hold: { variant: "outline", label: "On Hold" },
  };

  const { variant, label } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function DispensingStatusBadge({ status }: { status: DispensingStatus }) {
  const config: Record<
    DispensingStatus,
    { icon: typeof Clock; color: string; label: string }
  > = {
    pending: { icon: Clock, color: "text-yellow-600", label: "Pending Verification" },
    verified: { icon: CheckCircle, color: "text-blue-600", label: "Verified" },
    dispensed: { icon: Package, color: "text-green-600", label: "Dispensed" },
    ready_for_pickup: { icon: Package, color: "text-purple-600", label: "Ready for Pickup" },
    completed: { icon: CheckCircle, color: "text-green-600", label: "Completed" },
  };

  const { icon: Icon, color, label } = config[status];
  return (
    <Flex align="center" gap="xs" className={color}>
      <Icon className="h-4 w-4" />
      <span className="text-sm">{label}</span>
    </Flex>
  );
}

interface PrescriptionRowProps {
  prescription: Prescription;
  currentUserId?: number;
  onSelect?: (prescription: Prescription) => void;
  compact?: boolean;
}

const PrescriptionRow = memo(function PrescriptionRow({
  prescription,
  currentUserId,
  onSelect,
  compact,
}: PrescriptionRowProps) {
  const verifyMutation = useVerifyPrescription();
  const dispenseMutation = useDispensePrescription();
  const cancelMutation = useCancelPrescription();

  const canVerify =
    prescription.dispensingStatus === "pending" && currentUserId;
  const canDispense =
    prescription.dispensingStatus === "verified" && currentUserId;

  const handleVerify = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    verifyMutation.mutate({
      prescriptionId: String(prescription.ien),
      verifiedBy: currentUserId,
    });
  };

  const handleDispense = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    dispenseMutation.mutate({
      prescriptionId: String(prescription.ien),
      dispensedBy: currentUserId,
    });
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to cancel this prescription?")) {
      cancelMutation.mutate({
        prescriptionId: String(prescription.ien),
        reason: "Cancelled by pharmacist",
      });
    }
  };

  const isLoading =
    verifyMutation.isPending ||
    dispenseMutation.isPending ||
    cancelMutation.isPending;

  return (
    <TableRow
      className={cn(
        "cursor-pointer hover:bg-accent/50",
        prescription.status !== "active" && "opacity-60"
      )}
      onClick={() => onSelect?.(prescription)}
    >
      <TableCell>
        <Box>
          <span className="font-medium">{prescription.drugName}</span>
          {prescription.drugCode && (
            <span className="text-xs text-muted-foreground ml-2">
              ({prescription.drugCode})
            </span>
          )}
        </Box>
      </TableCell>
      <TableCell className="font-mono text-sm">{prescription.rxNumber}</TableCell>
      <TableCell>
        <span className="text-sm">{prescription.sig}</span>
      </TableCell>
      {!compact && (
        <>
          <TableCell>
            <Box>
              <span className="text-sm">Qty: {prescription.quantity}</span>
              <span className="text-xs text-muted-foreground block">
                {prescription.refillsRemaining}/{prescription.refillsAllowed} refills
              </span>
            </Box>
          </TableCell>
          <TableCell>
            <PrescriptionStatusBadge status={prescription.status} />
          </TableCell>
          <TableCell>
            <DispensingStatusBadge status={prescription.dispensingStatus} />
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {formatDate(prescription.orderDate)}
          </TableCell>
        </>
      )}
      <TableCell>
        <Flex gap="xs">
          {canVerify && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleVerify}
                  disabled={isLoading}
                >
                  {verifyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Verify Prescription</TooltipContent>
            </Tooltip>
          )}
          {canDispense && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDispense}
                  disabled={isLoading}
                >
                  {dispenseMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Package className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>Dispense</TooltipContent>
            </Tooltip>
          )}
          {prescription.status === "active" &&
            prescription.dispensingStatus === "pending" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="text-destructive hover:text-destructive"
                  >
                    {cancelMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cancel</TooltipContent>
              </Tooltip>
            )}
        </Flex>
      </TableCell>
    </TableRow>
  );
});

export const PrescriptionList = memo(function PrescriptionList({
  patientId,
  mode = "all",
  currentUserId,
  onSelectPrescription,
  compact = false,
  className,
}: PrescriptionListProps) {
  // Select the appropriate hook based on mode
  const allQuery = usePrescriptions();
  const pendingQuery = usePendingPrescriptions();
  const readyQuery = useReadyPrescriptions();
  const patientQuery = usePatientPrescriptions(patientId || "");

  const query =
    mode === "pending"
      ? pendingQuery
      : mode === "ready"
        ? readyQuery
        : mode === "patient" && patientId
          ? patientQuery
          : allQuery;

  const { data, isLoading, error, refetch } = query;

  const prescriptions = data?.prescriptions ?? [];

  const title =
    mode === "pending"
      ? "Pending Verification"
      : mode === "ready"
        ? "Ready for Pickup"
        : mode === "patient"
          ? "Patient Prescriptions"
          : "All Prescriptions";

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Box className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Box className="text-center text-destructive py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load prescriptions</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            {title}
            {prescriptions.length > 0 && (
              <Badge variant="secondary">{prescriptions.length}</Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </Flex>
      </CardHeader>
      <CardContent>
        {prescriptions.length === 0 ? (
          <Box className="text-center text-muted-foreground py-8">
            <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No prescriptions found</p>
          </Box>
        ) : (
          <Box className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Rx #</TableHead>
                  <TableHead>Directions</TableHead>
                  {!compact && (
                    <>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Ordered</TableHead>
                    </>
                  )}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((prescription) => (
                  <PrescriptionRow
                    key={prescription.ien}
                    prescription={prescription}
                    currentUserId={currentUserId}
                    onSelect={onSelectPrescription}
                    compact={compact}
                  />
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
});
