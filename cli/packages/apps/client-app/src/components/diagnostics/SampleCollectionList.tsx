/**
 * Sample Collection List Component
 * Worklist for phlebotomists to collect samples
 */

import { memo, useCallback } from "react";
import {
  Button,
  Badge,
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
} from "@lazarus-life/ui-components";
import { Droplet, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import type { Sample, SampleStatus, Priority } from "@lazarus-life/shared";

interface SampleCollectionListProps {
  samples: Sample[];
  onCollect: (sampleId: string) => void;
  onReceive: (sampleId: string) => void;
  onReject: (sampleId: string, reason: string) => void;
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

const statusIcons: Record<SampleStatus, React.ReactNode> = {
  pending_collection: <Clock className="h-4 w-4" />,
  collected: <Droplet className="h-4 w-4" />,
  received: <CheckCircle className="h-4 w-4" />,
  processing: <Clock className="h-4 w-4" />,
  analyzed: <CheckCircle className="h-4 w-4" />,
  verified: <CheckCircle className="h-4 w-4" />,
  rejected: <AlertTriangle className="h-4 w-4" />,
  cancelled: <AlertTriangle className="h-4 w-4" />,
};

export const SampleCollectionList = memo(function SampleCollectionList({
  samples,
  onCollect,
  onReceive,
  onReject,
  isLoading = false,
}: SampleCollectionListProps) {
  const handleReject = useCallback(
    (sampleId: string) => {
      const reason = window.prompt("Enter rejection reason:");
      if (reason) {
        onReject(sampleId, reason);
      }
    },
    [onReject]
  );

  const pendingCollection = samples.filter(
    (s) => s.status === "pending_collection"
  );
  const collected = samples.filter((s) => s.status === "collected");

  return (
    <div className="space-y-6">
      {/* Pending Collection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplet className="h-5 w-5 text-yellow-600" />
            Pending Collection ({pendingCollection.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingCollection.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No samples pending collection
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Sample Type</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingCollection.map((sample) => (
                  <TableRow key={sample.id}>
                    <TableCell className="font-medium">
                      {sample.sampleNumber}
                    </TableCell>
                    <TableCell>{sample.patientId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sample.sampleType}</Badge>
                    </TableCell>
                    <TableCell>{sample.tests?.length || 0} tests</TableCell>
                    <TableCell>
                      <Badge className={priorityColors[sample.priority || "routine"]}>
                        {sample.priority || "routine"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => onCollect(sample.id)}
                          disabled={isLoading}
                        >
                          Collect
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(sample.id)}
                          disabled={isLoading}
                        >
                          Reject
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

      {/* Collected - Pending Receipt */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplet className="h-5 w-5 text-blue-600" />
            Collected - Pending Receipt ({collected.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {collected.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No samples awaiting receipt at lab
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Sample Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Collected At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collected.map((sample) => (
                  <TableRow key={sample.id}>
                    <TableCell className="font-medium">
                      {sample.sampleNumber}
                    </TableCell>
                    <TableCell>{sample.patientId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{sample.sampleType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[sample.status]}>
                        <span className="mr-1">{statusIcons[sample.status]}</span>
                        {sample.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sample.collectedAt
                        ? new Date(sample.collectedAt).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => onReceive(sample.id)}
                        disabled={isLoading}
                      >
                        Receive at Lab
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
});
