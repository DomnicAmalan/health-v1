/**
 * Billing Page
 * Billing management with invoices, payments, and services
 */

import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import type { InvoiceSummary } from "@lazarus-life/shared/types/billing";
import {
  Box,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  CreditCard,
  FileText,
  Package,
  Plus,
  Receipt,
  Settings,
} from "lucide-react";
import { useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import {
  BillingStats,
  InvoiceBuilder,
  InvoiceList,
  PaymentForm,
} from "@/components/billing";
import { useInvoices } from "@/hooks/api/billing";

export const Route = createFileRoute("/billing")({
  component: BillingComponent,
});

function BillingComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.BILLING.VIEW} resource="billing">
      <BillingPageInner />
    </ProtectedRoute>
  );
}

function BillingPageInner() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState("invoices");
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSummary | null>(null);

  // Get counts for badges
  const { data: pendingData } = useInvoices({ status: "pending" });
  const { data: overdueData } = useInvoices({ status: "overdue" });

  const pendingCount = pendingData?.data.length ?? 0;
  const overdueCount = overdueData?.data.length ?? 0;

  const handleInvoiceSuccess = useCallback(() => {
    setShowNewInvoice(false);
    setActiveTab("invoices");
  }, []);

  const handlePaymentSuccess = useCallback((receiptNumber: string) => {
    setShowPayment(false);
    setSelectedInvoice(null);
    alert(`Payment recorded! Receipt: ${receiptNumber}`);
  }, []);

  const handleSelectInvoice = useCallback((invoice: InvoiceSummary) => {
    setSelectedInvoice(invoice);
  }, []);

  const handlePayInvoice = useCallback((invoice: InvoiceSummary) => {
    setSelectedInvoice(invoice);
    setShowPayment(true);
  }, []);

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Flex align="center" justify="between">
        <Box>
          <h1 className="text-3xl font-bold">{t("billing.title")}</h1>
          <p className="text-muted-foreground mt-2">
            {t("billing.subtitle")}
          </p>
        </Box>
        <Flex gap="sm">
          <Button variant="outline" onClick={() => setShowPayment(true)}>
            <CreditCard className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
          <Button onClick={() => setShowNewInvoice(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </Flex>
      </Flex>

      {/* Stats Cards */}
      <BillingStats />

      {/* Quick Actions */}
      <Box className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("invoices")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <FileText className="h-6 w-6 text-blue-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Invoices</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("invoices")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <Receipt className="h-6 w-6 text-red-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{overdueCount}</p>
                <p className="text-sm text-muted-foreground">Overdue</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("services")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Package className="h-6 w-6 text-purple-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Service Catalog</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>
      </Box>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            Invoices
            {pendingCount > 0 && (
              <Badge variant="secondary">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <Package className="h-4 w-4" />
            Services
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <Box className="mt-4">
          <TabsContent value="invoices">
            <InvoiceList
              onSelectInvoice={handleSelectInvoice}
              onPayInvoice={handlePayInvoice}
            />
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Recent Payments
                </CardTitle>
                <CardDescription>
                  View and manage payment records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Box className="text-center text-muted-foreground py-8">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Payment history coming soon</p>
                </Box>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Service Catalog
                </CardTitle>
                <CardDescription>
                  Manage billable services and pricing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Box className="text-center text-muted-foreground py-8">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Service catalog management coming soon</p>
                </Box>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Billing Settings
                </CardTitle>
                <CardDescription>
                  Configure tax rates, payment methods, and invoice templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Box className="text-center text-muted-foreground py-8">
                  <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Billing settings coming soon</p>
                </Box>
              </CardContent>
            </Card>
          </TabsContent>
        </Box>
      </Tabs>

      {/* New Invoice Dialog */}
      <Dialog open={showNewInvoice} onOpenChange={setShowNewInvoice}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <InvoiceBuilder
            patientId="0" // TODO: Add patient selector
            patientName="Select Patient"
            onSuccess={handleInvoiceSuccess}
            onCancel={() => setShowNewInvoice(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <PaymentForm
            patientId={selectedInvoice?.id || "0"}
            patientName={selectedInvoice?.patientName || "Select Patient"}
            invoiceId={selectedInvoice?.id}
            invoiceNumber={selectedInvoice?.invoiceNumber}
            balanceDue={selectedInvoice?.balanceDue}
            currencyCode={selectedInvoice?.currencyCode}
            onSuccess={handlePaymentSuccess}
            onCancel={() => {
              setShowPayment(false);
              setSelectedInvoice(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Invoice Details Dialog */}
      <Dialog
        open={!!selectedInvoice && !showPayment}
        onOpenChange={(open) => !open && setSelectedInvoice(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <Box className="space-y-4">
              <Flex align="center" justify="between">
                <Box>
                  <p className="font-mono text-lg font-bold">
                    {selectedInvoice.invoiceNumber}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedInvoice.invoiceDate).toLocaleDateString()}
                  </p>
                </Box>
                <Badge
                  variant={
                    selectedInvoice.status === "paid"
                      ? "default"
                      : selectedInvoice.status === "overdue"
                        ? "destructive"
                        : "secondary"
                  }
                  className="capitalize"
                >
                  {selectedInvoice.status.replace("_", " ")}
                </Badge>
              </Flex>

              <Box className="p-3 bg-muted/50 rounded-lg">
                <p className="font-medium">{selectedInvoice.patientName}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {selectedInvoice.invoiceType.replace("_", " ")} Invoice
                </p>
              </Box>

              <Box className="grid grid-cols-2 gap-4">
                <Box>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-lg font-bold">
                    {selectedInvoice.currencyCode}{" "}
                    {selectedInvoice.grandTotal.toFixed(2)}
                  </p>
                </Box>
                <Box>
                  <p className="text-sm text-muted-foreground">Balance Due</p>
                  <p
                    className={`text-lg font-bold ${
                      selectedInvoice.balanceDue > 0
                        ? "text-destructive"
                        : "text-green-600"
                    }`}
                  >
                    {selectedInvoice.balanceDue > 0
                      ? `${selectedInvoice.currencyCode} ${selectedInvoice.balanceDue.toFixed(2)}`
                      : "Paid"}
                  </p>
                </Box>
              </Box>

              {selectedInvoice.balanceDue > 0 && (
                <Button
                  className="w-full"
                  onClick={() => setShowPayment(true)}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
