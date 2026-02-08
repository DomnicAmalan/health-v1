/**
 * Results Page
 * Lab results management with pending verification, critical results, and all results
 */

import { useState, useCallback } from "react";
import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import {
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Flex,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lazarus-life/ui-components";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FlaskConical,
} from "lucide-react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import {
  usePendingVerificationResults,
  useCriticalResults,
  useVerifyLabResult,
  useNotifyCriticalResult,
} from "@/hooks/api/diagnostics";

export const Route = createFileRoute("/results")({
  component: ResultsComponent,
});

function ResultsComponent() {
  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.RESULTS.VIEW} resource="results">
      <ResultsPageInner />
    </ProtectedRoute>
  );
}

function ResultsPageInner() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("pending");

  // Data hooks
  const { data: pendingData, isLoading: pendingLoading } = usePendingVerificationResults();
  const { data: criticalData, isLoading: criticalLoading } = useCriticalResults();

  const pendingResults = Array.isArray(pendingData) ? pendingData : [];
  const criticalResults = Array.isArray(criticalData) ? criticalData : [];

  // Mutations
  const verifyResult = useVerifyLabResult();
  const notifyCritical = useNotifyCriticalResult();

  const handleVerify = useCallback(
    async (resultId: string) => {
      await verifyResult.mutateAsync({ resultId });
    },
    [verifyResult],
  );

  const handleNotifyCritical = useCallback(
    async (resultId: string) => {
      await notifyCritical.mutateAsync({
        resultId,
        data: {
          notifiedTo: "",
          notificationMethod: "phone",
          notes: "",
        },
      });
    },
    [notifyCritical],
  );

  return (
    <Box className="space-y-6">
      {/* Header */}
      <Box>
        <h1 className="text-3xl font-bold">{t("results.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("results.resultsRequiringReview")}</p>
      </Box>

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
                <p className="text-2xl font-bold">{pendingResults.length}</p>
                <p className="text-sm text-muted-foreground">Pending Verification</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-accent/50 transition-colors"
          onClick={() => setActiveTab("critical")}
        >
          <CardContent className="pt-6">
            <Flex align="center" gap="md">
              <Box className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </Box>
              <Box>
                <p className="text-2xl font-bold">{criticalResults.length}</p>
                <p className="text-sm text-muted-foreground">Critical Findings</p>
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
                <p className="text-sm text-muted-foreground">Verified Today</p>
              </Box>
            </Flex>
          </CardContent>
        </Card>
      </Box>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            Pending Verification
            {pendingResults.length > 0 && (
              <Badge variant="secondary">{pendingResults.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="critical" className="gap-2">
            <AlertCircle className="h-4 w-4" />
            Critical
            {criticalResults.length > 0 && (
              <Badge variant="destructive">{criticalResults.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2">
            <FlaskConical className="h-4 w-4" />
            All Results
          </TabsTrigger>
        </TabsList>

        <Box className="mt-4">
          {/* Pending Verification Tab */}
          <TabsContent value="pending">
            {pendingLoading ? (
              <Box className="text-center py-8 text-muted-foreground">Loading pending results...</Box>
            ) : pendingResults.length === 0 ? (
              <Box className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No results pending verification</p>
              </Box>
            ) : (
              <Box className="space-y-2">
                {pendingResults.map((result) => (
                  <Card key={result.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="flex items-center justify-between p-4">
                      <Flex align="center" gap="md" className="flex-1">
                        <Box className="p-2 rounded-lg bg-muted">
                          <FlaskConical className="h-4 w-4" />
                        </Box>
                        <Box>
                          <p className="font-medium">{result.testName || "Lab Result"}</p>
                          <p className="text-sm text-muted-foreground">
                            Patient: {result.patientId}
                            {result.value && <> &middot; Value: {result.value} {result.unit}</>}
                          </p>
                        </Box>
                      </Flex>
                      <Flex align="center" gap="sm">
                        {result.isCritical && (
                          <Badge variant="destructive">Critical</Badge>
                        )}
                        {result.isAbnormal && !result.isCritical && (
                          <Badge variant="default">Abnormal</Badge>
                        )}
                        <Badge variant="secondary">Pending</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerify(result.id)}
                          disabled={verifyResult.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verify
                        </Button>
                      </Flex>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </TabsContent>

          {/* Critical Results Tab */}
          <TabsContent value="critical">
            {criticalLoading ? (
              <Box className="text-center py-8 text-muted-foreground">Loading critical results...</Box>
            ) : criticalResults.length === 0 ? (
              <Box className="text-center py-12 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No critical results</p>
              </Box>
            ) : (
              <Box className="space-y-2">
                {criticalResults.map((result) => (
                  <Card key={result.id} className="border-red-200 hover:bg-accent/50 transition-colors">
                    <CardContent className="flex items-center justify-between p-4">
                      <Flex align="center" gap="md" className="flex-1">
                        <Box className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        </Box>
                        <Box>
                          <p className="font-medium">{result.testName || "Lab Result"}</p>
                          <p className="text-sm text-muted-foreground">
                            Patient: {result.patientId}
                            {result.value && (
                              <>
                                {" "}&middot; Value:{" "}
                                <span className="text-red-600 font-medium">
                                  {result.value} {result.unit}
                                </span>
                              </>
                            )}
                            {result.referenceRange && (
                              <> &middot; Ref: {result.referenceRange}</>
                            )}
                          </p>
                        </Box>
                      </Flex>
                      <Flex align="center" gap="sm">
                        <Badge variant="destructive">Critical</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleNotifyCritical(result.id)}
                          disabled={notifyCritical.isPending}
                        >
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Notify
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerify(result.id)}
                          disabled={verifyResult.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verify
                        </Button>
                      </Flex>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}
          </TabsContent>

          {/* All Results Tab */}
          <TabsContent value="all">
            <Box className="text-center py-12 text-muted-foreground">
              <FlaskConical className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Select a patient to view all results</p>
            </Box>
          </TabsContent>
        </Box>
      </Tabs>
    </Box>
  );
}
