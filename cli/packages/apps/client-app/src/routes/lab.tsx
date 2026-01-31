/**
 * Laboratory (LIS) Page
 * Lab orders, samples, results, and worklists
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
  FlaskConical,
  Droplet,
  ClipboardList,
  BarChart3,
  Plus,
} from "lucide-react";
import {
  LabOrderForm,
  SampleCollectionList,
  ResultEntryForm,
  LabWorklist,
  LabResultsView as _LabResultsView,
  DiagnosticsDashboard,
} from "@/components/diagnostics";
import {
  useLabTests,
  useTestPanels,
  usePendingCollectionSamples,
  usePendingReceiptSamples,
  usePendingProcessingSamples,
  usePendingVerificationResults,
  useCriticalResults,
  useCollectionWorklist,
  useVerificationWorklist as _useVerificationWorklist,
  useLabDashboard,
  useCreateLabOrder,
  useCollectSample,
  useReceiveSample,
  useRejectSample,
  useEnterLabResult as _useEnterLabResult,
  useVerifyLabResult,
  useNotifyCriticalResult,
} from "@/hooks/api/diagnostics";

export const Route = createFileRoute("/lab")({
  component: LabPage,
});

function LabPage() {
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedPatientId] = useState<string>(""); // Would come from patient context
  const [selectedSampleId, setSelectedSampleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  // Queries
  const { data: labTests = [] } = useLabTests();
  const { data: testPanels = [] } = useTestPanels();
  const { data: pendingCollectionSamples = [] } = usePendingCollectionSamples();
  const { data: pendingReceiptSamples = [] } = usePendingReceiptSamples();
  const { data: pendingProcessingSamples = [] } = usePendingProcessingSamples();
  const { data: pendingVerificationResults = [] } = usePendingVerificationResults();
  const { data: criticalResults = [] } = useCriticalResults();
  const { data: _collectionWorklist = [] } = useCollectionWorklist();
  const { data: labDashboardStats } = useLabDashboard();

  // Mutations
  const createOrderMutation = useCreateLabOrder();
  const collectSampleMutation = useCollectSample();
  const receiveSampleMutation = useReceiveSample();
  const rejectSampleMutation = useRejectSample();
  const verifyResultMutation = useVerifyLabResult();
  const notifyCriticalMutation = useNotifyCriticalResult();

  // Handlers
  const handleCreateOrder = useCallback(
    async (data: {
      patientId: string;
      orderingDoctorId: string;
      priority: "routine" | "urgent" | "stat";
      testIds: string[];
      clinicalNotes?: string;
    }) => {
      await createOrderMutation.mutateAsync(data);
      setShowOrderForm(false);
    },
    [createOrderMutation]
  );

  const handleCollectSample = useCallback(
    async (sampleId: string) => {
      await collectSampleMutation.mutateAsync({
        orderId: sampleId,
        sampleType: "blood",
        testIds: [],
      });
    },
    [collectSampleMutation]
  );

  const handleReceiveSample = useCallback(
    async (sampleId: string) => {
      await receiveSampleMutation.mutateAsync({
        sampleId,
        data: {
          // TODO: Get storage location from user input
        },
      });
    },
    [receiveSampleMutation]
  );

  const handleRejectSample = useCallback(
    async (sampleId: string, reason: string) => {
      await rejectSampleMutation.mutateAsync({ sampleId, reason });
    },
    [rejectSampleMutation]
  );

  const handleVerifyResult = useCallback(
    async (resultId: string) => {
      await verifyResultMutation.mutateAsync({ resultId });
    },
    [verifyResultMutation]
  );

  const handleNotifyCritical = useCallback(
    async (resultId: string) => {
      await notifyCriticalMutation.mutateAsync({
        resultId,
        data: {
          notifiedTo: "", // TODO: Get from user selection
          notificationMethod: "phone",
          notes: "",
        },
      });
    },
    [notifyCriticalMutation]
  );

  const allSamples = [
    ...pendingCollectionSamples,
    ...pendingReceiptSamples,
  ];

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-8 w-8 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold">Laboratory</h1>
            <p className="text-muted-foreground">
              Lab orders, sample collection, and results management
            </p>
          </div>
        </div>
        <Button onClick={() => setShowOrderForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Lab Order
        </Button>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="collection" className="flex items-center gap-2">
            <Droplet className="h-4 w-4" />
            Sample Collection
          </TabsTrigger>
          <TabsTrigger value="worklist" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Worklist
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Results
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <DiagnosticsDashboard labStats={labDashboardStats} />
        </TabsContent>

        {/* Sample Collection Tab */}
        <TabsContent value="collection">
          <SampleCollectionList
            samples={allSamples}
            onCollect={handleCollectSample}
            onReceive={handleReceiveSample}
            onReject={handleRejectSample}
            isLoading={
              collectSampleMutation.isPending ||
              receiveSampleMutation.isPending ||
              rejectSampleMutation.isPending
            }
          />
        </TabsContent>

        {/* Worklist Tab */}
        <TabsContent value="worklist">
          <LabWorklist
            pendingProcessing={pendingProcessingSamples}
            pendingVerification={pendingVerificationResults}
            criticalResults={criticalResults}
            onStartProcessing={(sampleId) => {
              setSelectedSampleId(sampleId);
            }}
            onVerifyResult={handleVerifyResult}
            onViewResult={(resultId) => {
              console.log("View result", resultId);
            }}
            onNotifyCritical={handleNotifyCritical}
            isLoading={
              verifyResultMutation.isPending || notifyCriticalMutation.isPending
            }
          />
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Recent Lab Results</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Select a patient to view their lab results, or search for
                specific results.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Order Dialog */}
      <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Create Lab Order</DialogTitle>
          </DialogHeader>
          <LabOrderForm
            patientId={selectedPatientId}
            tests={labTests}
            panels={testPanels}
            onSubmit={handleCreateOrder}
            onCancel={() => setShowOrderForm(false)}
            isSubmitting={createOrderMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Result Entry Dialog */}
      <Dialog
        open={!!selectedSampleId}
        onOpenChange={() => setSelectedSampleId(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Enter Results</DialogTitle>
          </DialogHeader>
          {selectedSampleId && (
            <ResultEntryForm
              sampleId={selectedSampleId}
              tests={labTests}
              onSubmit={async (results) => {
                console.log("Entering results", results);
                setSelectedSampleId(null);
              }}
              onCancel={() => setSelectedSampleId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
