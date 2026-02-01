/**
 * Patient Chart Route
 * Comprehensive patient chart with clinical data panels
 */

import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import type { EhrVitalType } from "@lazarus-life/shared/types/ehr";
import {
  Box,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@lazarus-life/ui-components";

const Spinner = () => (
  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
);
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Beaker,
  Calendar,
  ChevronLeft,
  FileText,
  Pill,
  Stethoscope,
} from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import {
  PatientBanner,
  ProblemList,
  MedicationList,
  AllergyList,
  VitalSignsPanel,
  LabResultsPanel,
  SOAPNoteForm,
  VitalTrendDialog,
  AppointmentsList,
  AddProblemDialog,
  AddMedicationDialog,
  AddVitalsDialog,
  AddAllergyDialog,
  OrderLabDialog,
} from "@/components/ehr";
import { useEhrPatient, useEhrPatientAllergies } from "@/hooks/api/ehr";

export const Route = createFileRoute("/patients/$patientId")({
  component: PatientChartComponent,
});

function PatientChartComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.PATIENTS.VIEW} resource="patients">
      <PatientChartInner />
    </ProtectedRoute>
  );
}

function PatientChartInner() {
  const { t: _t } = useTranslation();
  const navigate = useNavigate();
  const { patientId } = Route.useParams();

  // Initialize activeTab from URL hash
  const [activeTab, setActiveTab] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || "summary";
  });

  // Update URL hash when tab changes
  useEffect(() => {
    window.location.hash = activeTab;
  }, [activeTab]);

  // Listen to hash changes (browser back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setActiveTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Dialog states
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showVitalTrendDialog, setShowVitalTrendDialog] = useState(false);
  const [selectedVitalType, setSelectedVitalType] = useState<EhrVitalType | null>(null);
  const [showAddProblemDialog, setShowAddProblemDialog] = useState(false);
  const [showAddMedicationDialog, setShowAddMedicationDialog] = useState(false);
  const [showAddVitalsDialog, setShowAddVitalsDialog] = useState(false);
  const [showAddAllergyDialog, setShowAddAllergyDialog] = useState(false);
  const [showOrderLabDialog, setShowOrderLabDialog] = useState(false);

  const { data: patient, isLoading: isLoadingPatient, error: patientError } = useEhrPatient(patientId);
  const { data: allergies } = useEhrPatientAllergies(patientId);

  const handleBack = useCallback(() => {
    navigate({ to: "/patients" });
  }, [navigate]);

  const handleViewChart = useCallback(() => {
    setActiveTab("summary");
  }, []);

  const handleViewAllergies = useCallback(() => {
    setActiveTab("allergies");
  }, []);

  const handleAddNote = useCallback(() => {
    setShowNoteDialog(true);
  }, []);

  const handleNoteSuccess = useCallback((_documentId: string) => {
    setShowNoteDialog(false);
    setActiveTab("notes");
  }, []);

  const handleViewVitalTrend = useCallback((vitalType: EhrVitalType) => {
    setSelectedVitalType(vitalType);
    setShowVitalTrendDialog(true);
  }, []);

  if (isLoadingPatient) {
    return (
      <Box className="flex items-center justify-center h-64">
        <Spinner />
        <span className="ml-2 text-muted-foreground">Loading patient...</span>
      </Box>
    );
  }

  if (patientError || !patient) {
    return (
      <Box className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <h2 className="text-xl font-semibold mb-2">Patient Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The requested patient could not be found or you don't have permission to view it.
        </p>
        <Button onClick={handleBack}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Patients
        </Button>
      </Box>
    );
  }

  return (
    <Box className="space-y-6 p-6" role="main" aria-label={`Patient chart for ${patient.firstName} ${patient.lastName}`}>
        {/* Patient Banner */}
        <PatientBanner
          patient={patient}
          allergies={allergies}
          onViewChart={handleViewChart}
          onViewAllergies={handleViewAllergies}
        />

        {/* Chart Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Summary
          </TabsTrigger>
          <TabsTrigger value="problems" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Problems
          </TabsTrigger>
          <TabsTrigger value="medications" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Medications
          </TabsTrigger>
          <TabsTrigger value="allergies" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Allergies
          </TabsTrigger>
          <TabsTrigger value="vitals" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Vitals
          </TabsTrigger>
          <TabsTrigger value="labs" className="flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            Labs
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="appointments" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Appointments
          </TabsTrigger>
        </TabsList>

        {/* Summary Tab - Overview of all clinical data */}
        <TabsContent value="summary" className="space-y-6 mt-6">
          <Box className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <Box className="space-y-6">
              <AllergyList patientId={patientId} compact />
              <ProblemList patientId={patientId} compact />
              <MedicationList patientId={patientId} compact />
            </Box>

            {/* Right Column */}
            <Box className="space-y-6">
              <VitalSignsPanel
                patientId={patientId}
                onAddVitals={() => setShowAddVitalsDialog(true)}
                onViewTrend={handleViewVitalTrend}
              />
              <LabResultsPanel patientId={patientId} compact />
            </Box>
          </Box>
        </TabsContent>

        {/* Problems Tab */}
        <TabsContent value="problems" className="mt-6">
          <ProblemList
            patientId={patientId}
            showInactive
            onAddProblem={() => setShowAddProblemDialog(true)}
          />
        </TabsContent>

        {/* Medications Tab */}
        <TabsContent value="medications" className="mt-6">
          <MedicationList
            patientId={patientId}
            activeOnly={false}
            onAddMedication={() => setShowAddMedicationDialog(true)}
          />
        </TabsContent>

        {/* Allergies Tab */}
        <TabsContent value="allergies" className="mt-6">
          <AllergyList
            patientId={patientId}
            showActions
            onAddAllergy={() => setShowAddAllergyDialog(true)}
          />
        </TabsContent>

        {/* Vitals Tab */}
        <TabsContent value="vitals" className="mt-6">
          <VitalSignsPanel
            patientId={patientId}
            onAddVitals={() => setShowAddVitalsDialog(true)}
            onViewTrend={handleViewVitalTrend}
          />
        </TabsContent>

        {/* Labs Tab */}
        <TabsContent value="labs" className="mt-6">
          <LabResultsPanel
            patientId={patientId}
            onOrderLab={() => setShowOrderLabDialog(true)}
          />
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-6">
          <Box className="space-y-4">
            <Button onClick={handleAddNote}>
              <FileText className="h-4 w-4 mr-2" />
              New SOAP Note
            </Button>
            <Box className="text-center py-12 text-muted-foreground border rounded-lg">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Clinical notes will be displayed here</p>
              <p className="text-sm mt-2">Click "New SOAP Note" to create a note</p>
            </Box>
          </Box>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="mt-6">
          <AppointmentsList patientId={patientId} />
        </TabsContent>
      </Tabs>

      {/* SOAP Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Clinical Note</DialogTitle>
          </DialogHeader>
          <SOAPNoteForm
            patientId={patientId}
            onSuccess={handleNoteSuccess}
            onCancel={() => setShowNoteDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Vital Trend Dialog */}
      <VitalTrendDialog
        patientId={patientId}
        vitalType={selectedVitalType}
        open={showVitalTrendDialog}
        onOpenChange={setShowVitalTrendDialog}
      />

      {/* Add Problem Dialog */}
      <AddProblemDialog
        patientId={patientId}
        open={showAddProblemDialog}
        onOpenChange={setShowAddProblemDialog}
      />

      {/* Add Medication Dialog */}
      <AddMedicationDialog
        patientId={patientId}
        open={showAddMedicationDialog}
        onOpenChange={setShowAddMedicationDialog}
      />

      {/* Add Vitals Dialog */}
      <AddVitalsDialog
        patientId={patientId}
        open={showAddVitalsDialog}
        onOpenChange={setShowAddVitalsDialog}
      />

      {/* Add Allergy Dialog */}
      <AddAllergyDialog
        patientId={patientId}
        open={showAddAllergyDialog}
        onOpenChange={setShowAddAllergyDialog}
      />

      {/* Order Lab Dialog */}
      <OrderLabDialog
        patientId={patientId}
        open={showOrderLabDialog}
        onOpenChange={setShowOrderLabDialog}
      />
    </Box>
  );
}
