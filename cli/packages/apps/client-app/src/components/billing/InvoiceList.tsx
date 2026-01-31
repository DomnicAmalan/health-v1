/**
 * InvoiceList Component
 * Display invoices with filters and actions
 */

import type { InvoiceStatus, InvoiceSummary } from "@lazarus-life/shared/types/billing";
import {
  Box,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
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
} from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import {
  AlertCircle,
  CreditCard,
  FileText,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { memo, useState, useCallback } from "react";
import { useInvoices, useCancelInvoice } from "@/hooks/api/billing";

interface InvoiceListProps {
  patientId?: string;
  onSelectInvoice?: (invoice: InvoiceSummary) => void;
  onPayInvoice?: (invoice: InvoiceSummary) => void;
  className?: string;
}

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
  partially_paid: { label: "Partial", variant: "secondary" },
  paid: { label: "Paid", variant: "default" },
  overdue: { label: "Overdue", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  refunded: { label: "Refunded", variant: "outline" },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className || ""}`} />
);

export const InvoiceList = memo(function InvoiceList({
  patientId,
  onSelectInvoice,
  onPayInvoice,
  className,
}: InvoiceListProps) {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");

  const { data, isLoading, error, refetch } = useInvoices({
    patientId,
    status: statusFilter === "all" ? undefined : statusFilter,
  });

  const cancelMutation = useCancelInvoice();

  const handleCancel = useCallback(
    (invoice: InvoiceSummary, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm("Are you sure you want to cancel this invoice?")) {
        cancelMutation.mutate({
          invoiceId: invoice.id,
          reason: "Cancelled by user",
        });
      }
    },
    [cancelMutation]
  );

  const invoices = data?.data ?? [];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Invoices
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
            <FileText className="h-5 w-5" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Box className="text-center text-destructive py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load invoices</p>
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
            <FileText className="h-5 w-5" />
            Invoices
            {invoices.length > 0 && (
              <Badge variant="secondary">{invoices.length}</Badge>
            )}
          </CardTitle>
          <Flex gap="sm">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as InvoiceStatus | "all")}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="partially_paid">Partial</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </Flex>
        </Flex>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <Box className="text-center text-muted-foreground py-8">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No invoices found</p>
          </Box>
        ) : (
          <Box className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className={cn(
                      "cursor-pointer hover:bg-accent/50",
                      invoice.status === "cancelled" && "opacity-60"
                    )}
                    onClick={() => onSelectInvoice?.(invoice)}
                  >
                    <TableCell className="font-mono font-medium">
                      {invoice.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(invoice.invoiceDate)}
                    </TableCell>
                    <TableCell>{invoice.patientName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {invoice.invoiceType.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {invoice.currencyCode} {invoice.grandTotal.toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium",
                        invoice.balanceDue > 0 && "text-destructive"
                      )}
                    >
                      {invoice.balanceDue > 0 ? (
                        <>
                          {invoice.currencyCode} {invoice.balanceDue.toFixed(2)}
                        </>
                      ) : (
                        <span className="text-green-600">Paid</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell>
                      <Flex gap="xs">
                        {invoice.balanceDue > 0 &&
                          invoice.status !== "cancelled" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation();
                                onPayInvoice?.(invoice);
                              }}
                            >
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          )}
                        {invoice.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e: React.MouseEvent) => handleCancel(invoice, e)}
                            disabled={cancelMutation.isPending}
                            className="text-destructive hover:text-destructive"
                          >
                            {cancelMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </Flex>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
});
