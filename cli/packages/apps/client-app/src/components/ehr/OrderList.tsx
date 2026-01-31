/**
 * OrderList Component
 * Displays patient's orders (lab, radiology, medication, consult)
 */

import type { EhrOrder } from "@lazarus-life/shared/types/ehr";
import {
  Box,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
} from "@lazarus-life/ui-components";

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className || ""}`} />
);
import { cn } from "@lazarus-life/ui-components/utils";
import {
  AlertCircle,
  AlertTriangle,
  BeakerIcon,
  CheckCircle,
  ClipboardList,
  FileText,
  ImageIcon,
  Pill,
  Plus,
  XCircle,
} from "lucide-react";
import { memo } from "react";
import { useEhrPatientOrders } from "@/hooks/api/ehr";

interface OrderListProps {
  patientId: string;
  visitId?: string;
  orderType?: EhrOrder["orderType"];
  onAddOrder?: () => void;
  onSelectOrder?: (order: EhrOrder) => void;
  compact?: boolean;
  className?: string;
  limit?: number;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function OrderTypeIcon({ orderType }: { orderType: EhrOrder["orderType"] }) {
  switch (orderType) {
    case "lab":
      return <BeakerIcon className="h-4 w-4 text-blue-600" />;
    case "radiology":
      return <ImageIcon className="h-4 w-4 text-purple-600" />;
    case "medication":
      return <Pill className="h-4 w-4 text-green-600" />;
    case "consult":
      return <FileText className="h-4 w-4 text-orange-600" />;
    default:
      return <ClipboardList className="h-4 w-4 text-muted-foreground" />;
  }
}

function OrderStatusBadge({ status, urgency }: { status: EhrOrder["status"]; urgency?: EhrOrder["urgency"] }) {
  const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    pending: { variant: "outline", label: "Pending" },
    active: { variant: "default", label: "Active" },
    completed: { variant: "secondary", label: "Completed" },
    discontinued: { variant: "destructive", label: "Discontinued" },
    cancelled: { variant: "destructive", label: "Cancelled" },
    expired: { variant: "outline", label: "Expired" },
    held: { variant: "outline", label: "Held" },
  };

  const config = statusConfig[status] || { variant: "outline" as const, label: status };

  return (
    <Flex gap="xs">
      <Badge variant={config.variant}>{config.label}</Badge>
      {urgency === "stat" && (
        <Badge variant="destructive" className="uppercase">
          STAT
        </Badge>
      )}
      {urgency === "asap" && (
        <Badge variant="default" className="uppercase bg-orange-500">
          ASAP
        </Badge>
      )}
    </Flex>
  );
}

interface OrderItemProps {
  order: EhrOrder;
  onSelect?: (order: EhrOrder) => void;
  compact?: boolean;
}

const OrderItem = memo(function OrderItem({
  order,
  onSelect,
  compact,
}: OrderItemProps) {
  const isPending = order.status === "pending" || order.status === "active";

  return (
    <Box
      className={cn(
        "border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer",
        isPending && "border-primary/50",
        order.urgency === "stat" && "border-destructive/50 bg-destructive/5"
      )}
      onClick={() => onSelect?.(order)}
    >
      <Flex align="start" gap="sm">
        <OrderTypeIcon orderType={order.orderType} />
        <Box className="flex-1 min-w-0">
          <Flex align="center" gap="sm" className="mb-1">
            <span className="font-medium truncate">{order.orderText}</span>
            <OrderStatusBadge status={order.status} urgency={order.urgency} />
          </Flex>

          {!compact && (
            <>
              <Flex gap="md" className="text-sm text-muted-foreground mt-1">
                <span className="capitalize">{order.orderType}</span>
                <span>Ordered: {formatDate(order.startDatetime)}</span>
              </Flex>

              {order.orderingProviderName && (
                <p className="text-xs text-muted-foreground mt-1">
                  By: {order.orderingProviderName}
                </p>
              )}

              {order.instructions && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  "{order.instructions}"
                </p>
              )}

              {order.status === "pending" && !order.signedDatetime && (
                <Flex align="center" gap="xs" className="text-xs text-amber-600 mt-2">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Awaiting signature</span>
                </Flex>
              )}
            </>
          )}
        </Box>
        {order.status === "completed" && (
          <CheckCircle className="h-4 w-4 text-green-600" />
        )}
        {order.status === "discontinued" && (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
      </Flex>
    </Box>
  );
});

export const OrderList = memo(function OrderList({
  patientId,
  visitId,
  orderType,
  onAddOrder,
  onSelectOrder,
  compact = false,
  className,
  limit,
}: OrderListProps) {
  const { data, isLoading, error } = useEhrPatientOrders(patientId, limit ? { limit, offset: 0 } : { limit: 20, offset: 0 });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Box className="text-center text-destructive py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load orders</p>
          </Box>
        </CardContent>
      </Card>
    );
  }

  let orders = data?.items ?? [];
  if (visitId) {
    orders = orders.filter((o) => o.visitId === visitId);
  }
  if (orderType) {
    orders = orders.filter((o) => o.orderType === orderType);
  }

  const pendingOrders = orders.filter(
    (o) => o.status === "pending" || o.status === "active"
  );
  const statOrders = orders.filter((o) => o.urgency === "stat" && o.status !== "completed");

  return (
    <Card className={className}>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Orders
            {pendingOrders.length > 0 && (
              <Badge variant="secondary">{pendingOrders.length} pending</Badge>
            )}
            {statOrders.length > 0 && (
              <Badge variant="destructive">{statOrders.length} STAT</Badge>
            )}
          </CardTitle>
          {onAddOrder && (
            <Button variant="outline" size="sm" onClick={onAddOrder}>
              <Plus className="h-4 w-4 mr-1" />
              New Order
            </Button>
          )}
        </Flex>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <Box className="text-center text-muted-foreground py-8">
            <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No orders</p>
          </Box>
        ) : (
          <Box className="space-y-2">
            {orders.map((order) => (
              <OrderItem
                key={order.id}
                order={order}
                onSelect={onSelectOrder}
                compact={compact}
              />
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
});
