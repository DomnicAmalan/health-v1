/**
 * Orders Page
 * Order management with unsigned orders, STAT orders, and all orders view
 */

import { useState, useCallback } from "react";
import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import type { EhrOrder } from "@lazarus-life/shared/types/ehr";
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Flex,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lazarus-life/ui-components";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle,
  ClipboardList,
  FileText,
  PenLine,
  Plus,
} from "lucide-react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import {
  useEhrUnsignedOrders,
  useEhrStatOrders,
  useSignEhrOrder,
  useDiscontinueEhrOrder,
  useHoldEhrOrder,
  useReleaseEhrOrder,
} from "@/hooks/api/ehr/useEhrOrders";

export const Route = createFileRoute("/orders")({
  component: OrdersComponent,
});

function OrdersComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.ORDERS.VIEW} resource="orders">
      <OrdersPageInner />
    </ProtectedRoute>
  );
}

function OrdersPageInner() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("unsigned");
  const [selectedOrder, setSelectedOrder] = useState<EhrOrder | null>(null);

  // Data hooks
  const { data: unsignedData, isLoading: unsignedLoading } = useEhrUnsignedOrders();
  const { data: statData, isLoading: statLoading } = useEhrStatOrders();

  const unsignedOrders = Array.isArray(unsignedData) ? unsignedData : [];
  const statOrders = Array.isArray(statData) ? statData : [];

  // Mutations
  const signOrder = useSignEhrOrder();
  const discontinueOrder = useDiscontinueEhrOrder();
  const holdOrder = useHoldEhrOrder();
  const releaseOrder = useReleaseEhrOrder();

  const handleSign = useCallback(
    async (id: string) => {
      await signOrder.mutateAsync(id);
    },
    [signOrder],
  );

  const handleDiscontinue = useCallback(
    async (id: string) => {
      await discontinueOrder.mutateAsync({ id, reason: "Discontinued by provider" });
    },
    [discontinueOrder],
  );

  const handleHold = useCallback(
    async (id: string) => {
      await holdOrder.mutateAsync({ id, reason: "Held by provider" });
    },
    [holdOrder],
  );

  const handleRelease = useCallback(
    async (id: string) => {
      await releaseOrder.mutateAsync(id);
    },
    [releaseOrder],
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "completed":
        return <Badge>Completed</Badge>;
      case "discontinued":
        return <Badge variant="outline">Discontinued</Badge>;
      case "held":
        return <Badge variant="secondary">Held</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (urgency?: string) => {
    if (urgency === "stat") return <Badge variant="destructive">STAT</Badge>;
    if (urgency === "urgent") return <Badge variant="default">Urgent</Badge>;
    return null;
  };

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Flex align="center" justify="between">
        <Box>
          <h1 className="text-3xl font-bold">{t("orders.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("orders.subtitle")}</p>
        </Box>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {t("quickActions.enterOrder")}
        </Button>
      </Flex>

      {/* Stats Cards */}
      <Box className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("unsigned")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <PenLine className="h-6 w-6 text-yellow-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{unsignedOrders.length}</p>
                <p className="text-sm text-muted-foreground">Unsigned Orders</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("stat")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{statOrders.length}</p>
                <p className="text-sm text-muted-foreground">STAT Orders</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Completed Today</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="unsigned" className="gap-2">
            <PenLine className="h-4 w-4" />
            Unsigned
            {unsignedOrders.length > 0 && (
              <Badge variant="secondary">{unsignedOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="stat" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            STAT
            {statOrders.length > 0 && (
              <Badge variant="destructive">{statOrders.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            All Orders
          </TabsTrigger>
        </TabsList>

        <Box className="mt-4">
          {/* Unsigned Orders Tab */}
          <TabsContent value="unsigned">
            {unsignedLoading ? (
              <Box className="text-center py-8 text-muted-foreground">Loading unsigned orders...</Box>
            ) : unsignedOrders.length === 0 ? (
              <Box className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No unsigned orders</p>
              </Box>
            ) : (
              <OrderTable
                orders={unsignedOrders}
                onSelect={setSelectedOrder}
                getStatusBadge={getStatusBadge}
                getPriorityBadge={getPriorityBadge}
                onSign={handleSign}
              />
            )}
          </TabsContent>

          {/* STAT Orders Tab */}
          <TabsContent value="stat">
            {statLoading ? (
              <Box className="text-center py-8 text-muted-foreground">Loading STAT orders...</Box>
            ) : statOrders.length === 0 ? (
              <Box className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No STAT orders</p>
              </Box>
            ) : (
              <OrderTable
                orders={statOrders}
                onSelect={setSelectedOrder}
                getStatusBadge={getStatusBadge}
                getPriorityBadge={getPriorityBadge}
                onSign={handleSign}
              />
            )}
          </TabsContent>

          {/* All Orders Tab */}
          <TabsContent value="all">
            <Box className="text-center py-12 text-muted-foreground">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Select a patient to view all orders</p>
            </Box>
          </TabsContent>
        </Box>
      </Tabs>

      {/* Order Detail Dialog */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open: boolean) => !open && setSelectedOrder(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <Box className="space-y-4">
              <Flex align="center" gap="sm">
                <FileText className="h-5 w-5" />
                <span className="font-medium text-lg">
                  {selectedOrder.orderType || "Order"}
                </span>
              </Flex>

              <Box className="grid grid-cols-2 gap-4 text-sm">
                <Box>
                  <span className="text-muted-foreground">Order ID</span>
                  <p className="font-mono">{selectedOrder.id}</p>
                </Box>
                <Box>
                  <span className="text-muted-foreground">Status</span>
                  <Box className="mt-1">{getStatusBadge(selectedOrder.status)}</Box>
                </Box>
                <Box>
                  <span className="text-muted-foreground">Patient</span>
                  <p>{selectedOrder.patientId}</p>
                </Box>
                <Box>
                  <span className="text-muted-foreground">Priority</span>
                  <Box className="mt-1">
                    {getPriorityBadge(selectedOrder.urgency) || (
                      <Badge variant="outline">Routine</Badge>
                    )}
                  </Box>
                </Box>
              </Box>

              {selectedOrder.instructions && (
                <Box>
                  <span className="text-muted-foreground text-sm">Instructions</span>
                  <p className="mt-1">{selectedOrder.instructions}</p>
                </Box>
              )}

              <Flex gap="sm" className="pt-2">
                {selectedOrder.status === "pending" && (
                  <Button size="sm" onClick={() => handleSign(selectedOrder.id)}>
                    <PenLine className="h-4 w-4 mr-1" />
                    Sign
                  </Button>
                )}
                {selectedOrder.status === "active" && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleHold(selectedOrder.id)}
                    >
                      Hold
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDiscontinue(selectedOrder.id)}
                    >
                      Discontinue
                    </Button>
                  </>
                )}
                {selectedOrder.status === "held" && (
                  <Button size="sm" onClick={() => handleRelease(selectedOrder.id)}>
                    Release
                  </Button>
                )}
              </Flex>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function OrderTable({
  orders,
  onSelect,
  getStatusBadge,
  getPriorityBadge,
  onSign,
}: {
  orders: EhrOrder[];
  onSelect: (order: EhrOrder) => void;
  getStatusBadge: (status: string) => React.ReactNode;
  getPriorityBadge: (urgency?: string) => React.ReactNode;
  onSign: (id: string) => void;
}) {
  return (
    <Box className="space-y-2">
      {orders.map((order) => (
        <Card
          key={order.id}
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => onSelect(order)}
        >
          <CardContent className="flex items-center justify-between p-4">
            <Flex align="center" gap="md" className="flex-1">
              <Box className="p-2 rounded-lg bg-muted">
                <FileText className="h-4 w-4" />
              </Box>
              <Box>
                <p className="font-medium">{order.orderType || "Order"}</p>
                <p className="text-sm text-muted-foreground">
                  Patient: {order.patientId}
                  {order.createdAt && (
                    <> &middot; {new Date(order.createdAt).toLocaleDateString()}</>
                  )}
                </p>
              </Box>
            </Flex>
            <Flex align="center" gap="sm">
              {getPriorityBadge(order.urgency)}
              {getStatusBadge(order.status)}
              {order.status === "pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onSign(order.id);
                  }}
                >
                  <PenLine className="h-3 w-3 mr-1" />
                  Sign
                </Button>
              )}
            </Flex>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
