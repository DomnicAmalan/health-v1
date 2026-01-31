/**
 * Pharmacy Page
 * Pharmacy management with drug catalog, prescriptions, and dispensing workflow
 */

import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import type { Drug, Prescription } from "@lazarus-life/shared/types/ehr";
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
  CheckCircle,
  Clock,
  Package,
  Pill,
  Plus,
  Search,
} from "lucide-react";
import { useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import {
  DrugSearchSelect,
  PrescriptionList,
  PrescriptionForm,
  DrugDetailsFull,
} from "@/components/pharmacy";
import {
  usePendingPrescriptions,
  useReadyPrescriptions,
} from "@/hooks/api/pharmacy";
import { useAuthStore } from "@/stores/authStore";

export const Route = createFileRoute("/pharmacy")({
  component: PharmacyComponent,
});

function PharmacyComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.PHARMACY.VIEW} resource="pharmacy">
      <PharmacyPageInner />
    </ProtectedRoute>
  );
}

function PharmacyPageInner() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const currentUserId = user?.id ? parseInt(user.id, 10) : undefined;

  const [activeTab, setActiveTab] = useState("pending");
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  // Get counts for badges
  const { data: pendingData } = usePendingPrescriptions();
  const { data: readyData } = useReadyPrescriptions();

  const pendingCount = pendingData?.prescriptions.length ?? 0;
  const readyCount = readyData?.prescriptions.length ?? 0;

  const handleNewPrescriptionSuccess = useCallback((_ien: number) => {
    setShowNewPrescription(false);
    setActiveTab("pending");
  }, []);

  const handleDrugSelect = useCallback((drug: Drug | null) => {
    setSelectedDrug(drug);
  }, []);

  const handlePrescriptionSelect = useCallback((prescription: Prescription) => {
    setSelectedPrescription(prescription);
  }, []);

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Flex align="center" justify="between">
        <Box>
          <h1 className="text-3xl font-bold">{t("pharmacy.title")}</h1>
          <p className="text-muted-foreground mt-2">{t("pharmacy.subtitle")}</p>
        </Box>
        <Button onClick={() => setShowNewPrescription(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Prescription
        </Button>
      </Flex>

      {/* Stats Cards */}
      <Box className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("pending")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="h-6 w-6 text-yellow-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-sm text-muted-foreground">Pending Verification</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("ready")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Package className="h-6 w-6 text-purple-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{readyCount}</p>
                <p className="text-sm text-muted-foreground">Ready for Pickup</p>
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

      {/* Drug Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Drug Lookup
          </CardTitle>
          <CardDescription>
            Search the drug catalog to view information, interactions, and contraindications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Box className="max-w-lg">
            <DrugSearchSelect
              value={selectedDrug}
              onSelect={handleDrugSelect}
              formularyOnly={false}
              placeholder="Search for a drug..."
            />
          </Box>
        </CardContent>
      </Card>

      {/* Drug Details (if selected) */}
      {selectedDrug && (
        <DrugDetailsFull drug={selectedDrug} />
      )}

      {/* Prescriptions Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending Verification
            {pendingCount > 0 && (
              <Badge variant="secondary">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="ready" className="gap-2">
            <Package className="h-4 w-4" />
            Ready for Pickup
            {readyCount > 0 && (
              <Badge variant="secondary">{readyCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <Pill className="h-4 w-4" />
            All Prescriptions
          </TabsTrigger>
        </TabsList>

        <Box className="mt-4">
          <TabsContent value="pending">
            <PrescriptionList
              mode="pending"
              currentUserId={currentUserId}
              onSelectPrescription={handlePrescriptionSelect}
            />
          </TabsContent>

          <TabsContent value="ready">
            <PrescriptionList
              mode="ready"
              currentUserId={currentUserId}
              onSelectPrescription={handlePrescriptionSelect}
            />
          </TabsContent>

          <TabsContent value="all">
            <PrescriptionList
              mode="all"
              currentUserId={currentUserId}
              onSelectPrescription={handlePrescriptionSelect}
            />
          </TabsContent>
        </Box>
      </Tabs>

      {/* New Prescription Dialog */}
      <Dialog open={showNewPrescription} onOpenChange={setShowNewPrescription}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Prescription</DialogTitle>
          </DialogHeader>
          <PrescriptionForm
            patientIen={0} // TODO: Add patient selector
            prescriberIen={currentUserId}
            onSuccess={handleNewPrescriptionSuccess}
            onCancel={() => setShowNewPrescription(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Prescription Details Dialog */}
      <Dialog
        open={!!selectedPrescription}
        onOpenChange={(open) => !open && setSelectedPrescription(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Prescription Details</DialogTitle>
          </DialogHeader>
          {selectedPrescription && (
            <Box className="space-y-4">
              <Flex align="center" gap="sm">
                <Pill className="h-5 w-5" />
                <span className="font-medium text-lg">
                  {selectedPrescription.drugName}
                </span>
              </Flex>

              <Box className="grid grid-cols-2 gap-4 text-sm">
                <Box>
                  <span className="text-muted-foreground">Rx Number</span>
                  <p className="font-mono">{selectedPrescription.rxNumber}</p>
                </Box>
                <Box>
                  <span className="text-muted-foreground">Quantity</span>
                  <p>{selectedPrescription.quantity}</p>
                </Box>
                <Box>
                  <span className="text-muted-foreground">Days Supply</span>
                  <p>{selectedPrescription.daysSupply} days</p>
                </Box>
                <Box>
                  <span className="text-muted-foreground">Refills</span>
                  <p>
                    {selectedPrescription.refillsRemaining} of{" "}
                    {selectedPrescription.refillsAllowed} remaining
                  </p>
                </Box>
              </Box>

              <Box>
                <span className="text-muted-foreground text-sm">Directions</span>
                <p className="mt-1">{selectedPrescription.sig}</p>
              </Box>

              <Box>
                <span className="text-muted-foreground text-sm">Status</span>
                <Flex gap="sm" className="mt-1">
                  <Badge>{selectedPrescription.status}</Badge>
                  <Badge variant="outline">{selectedPrescription.dispensingStatus}</Badge>
                </Flex>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
