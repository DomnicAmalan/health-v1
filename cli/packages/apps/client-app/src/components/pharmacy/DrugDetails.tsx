/**
 * DrugDetails Component
 * Displays detailed information about a drug
 */

import type { Drug } from "@lazarus-life/shared/types/ehr";
import {
  Box,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import {
  AlertCircle,
  Baby,
  Beaker,
  BookOpen,
  Droplets,
  Info,
  Pill,
  ShieldAlert,
  Snowflake,
  Sun,
  Syringe,
  Users,
} from "lucide-react";
import { memo, useState } from "react";
import { useDrug, useDrugInteractions, useDrugContraindications } from "@/hooks/api/pharmacy";

interface DrugDetailsProps {
  drugId: string;
  className?: string;
}

interface DrugDetailsFullProps {
  drug: Drug;
  className?: string;
}

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-muted rounded ${className || ""}`} />
);

function InfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value?: string | number | null;
  className?: string;
}) {
  if (!value) return null;
  return (
    <Flex className={cn("py-1", className)}>
      <span className="text-sm text-muted-foreground w-40 shrink-0">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </Flex>
  );
}

function DrugOverview({ drug }: { drug: Drug }) {
  return (
    <Box className="space-y-4">
      {/* Basic Info */}
      <Box>
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Pill className="h-4 w-4" />
          Basic Information
        </h4>
        <Box className="pl-6 border-l-2 border-muted space-y-1">
          <InfoRow label="Generic Name" value={drug.genericName} />
          <InfoRow
            label="Brand Names"
            value={drug.brandNames.length > 0 ? drug.brandNames.join(", ") : undefined}
          />
          <InfoRow label="Drug Code" value={drug.drugCode} />
          <InfoRow label="Form" value={drug.form} />
          <InfoRow label="Route" value={drug.route} />
          <InfoRow
            label="Strength"
            value={drug.strength ? `${drug.strength} ${drug.strengthUnit || ""}` : undefined}
          />
        </Box>
      </Box>

      {/* Classification */}
      <Box>
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Classification
        </h4>
        <Box className="pl-6 border-l-2 border-muted space-y-1">
          <InfoRow label="Therapeutic Class" value={drug.therapeuticClass} />
          <InfoRow label="Pharmacological Class" value={drug.pharmacologicalClass} />
          {drug.schedule && (
            <Flex className="py-1">
              <span className="text-sm text-muted-foreground w-40 shrink-0">
                Schedule
              </span>
              <Badge
                variant={drug.schedule.isControlled ? "destructive" : "secondary"}
              >
                {drug.schedule.name} ({drug.schedule.code})
              </Badge>
            </Flex>
          )}
        </Box>
      </Box>

      {/* Coding Systems */}
      <Box>
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Beaker className="h-4 w-4" />
          Coding Systems
        </h4>
        <Box className="pl-6 border-l-2 border-muted space-y-1">
          <InfoRow label="ATC Code" value={drug.atcCode} />
          <InfoRow label="RxNorm Code" value={drug.rxnormCode} />
          <InfoRow label="NDC Code" value={drug.ndcCode} />
          <InfoRow label="SNOMED Code" value={drug.snomedCode} />
        </Box>
      </Box>
    </Box>
  );
}

function DrugDosing({ drug }: { drug: Drug }) {
  return (
    <Box className="space-y-4">
      {/* Dosing Information */}
      <Box>
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Syringe className="h-4 w-4" />
          Dosing Information
        </h4>
        <Box className="pl-6 border-l-2 border-muted space-y-1">
          <InfoRow label="Usual Dose" value={drug.usualDose} />
          <InfoRow label="Max Daily Dose" value={drug.maxDailyDose} />
        </Box>
      </Box>

      {/* Special Populations */}
      <Box>
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Users className="h-4 w-4" />
          Special Populations
        </h4>
        <Box className="pl-6 border-l-2 border-muted space-y-1">
          <InfoRow label="Pediatric Dose" value={drug.pediatricDose} />
          <InfoRow label="Geriatric Dose" value={drug.geriatricDose} />
        </Box>
      </Box>

      {/* Adjustments */}
      <Box>
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Dose Adjustments
        </h4>
        <Box className="pl-6 border-l-2 border-muted">
          <Flex gap="md" className="py-2">
            <Badge variant={drug.renalAdjustmentRequired ? "destructive" : "outline"}>
              {drug.renalAdjustmentRequired
                ? "Renal Adjustment Required"
                : "No Renal Adjustment"}
            </Badge>
            <Badge variant={drug.hepaticAdjustmentRequired ? "destructive" : "outline"}>
              {drug.hepaticAdjustmentRequired
                ? "Hepatic Adjustment Required"
                : "No Hepatic Adjustment"}
            </Badge>
          </Flex>
        </Box>
      </Box>

      {/* Pregnancy & Lactation */}
      <Box>
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Baby className="h-4 w-4" />
          Pregnancy & Lactation
        </h4>
        <Box className="pl-6 border-l-2 border-muted space-y-1">
          {drug.pregnancyCategory && (
            <Flex className="py-1">
              <span className="text-sm text-muted-foreground w-40 shrink-0">
                Pregnancy Category
              </span>
              <Badge variant="secondary">{drug.pregnancyCategory}</Badge>
            </Flex>
          )}
          {drug.lactationSafe !== undefined && (
            <Flex className="py-1">
              <span className="text-sm text-muted-foreground w-40 shrink-0">
                Lactation
              </span>
              <Badge variant={drug.lactationSafe ? "outline" : "destructive"}>
                {drug.lactationSafe ? "Safe" : "Not Safe"}
              </Badge>
            </Flex>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function DrugStorage({ drug }: { drug: Drug }) {
  return (
    <Box className="space-y-4">
      <Box>
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Droplets className="h-4 w-4" />
          Storage Requirements
        </h4>
        <Box className="pl-6 border-l-2 border-muted space-y-3">
          <InfoRow label="Storage Conditions" value={drug.storageConditions} />
          <InfoRow
            label="Shelf Life"
            value={drug.shelfLifeMonths ? `${drug.shelfLifeMonths} months` : undefined}
          />

          <Flex gap="md" className="py-2">
            {drug.requiresRefrigeration && (
              <Badge variant="secondary" className="gap-1">
                <Snowflake className="h-3 w-3" />
                Requires Refrigeration
              </Badge>
            )}
            {drug.lightSensitive && (
              <Badge variant="secondary" className="gap-1">
                <Sun className="h-3 w-3" />
                Light Sensitive
              </Badge>
            )}
          </Flex>
        </Box>
      </Box>

      {/* Pricing (if available) */}
      {drug.unitPrice && (
        <Box>
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Pricing
          </h4>
          <Box className="pl-6 border-l-2 border-muted space-y-1">
            <InfoRow
              label="Unit Price"
              value={`${drug.currencyCode || "USD"} ${drug.unitPrice.toFixed(2)}`}
            />
            {drug.priceEffectiveDate && (
              <InfoRow
                label="Price Effective"
                value={new Date(drug.priceEffectiveDate).toLocaleDateString()}
              />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

function DrugInteractionsTab({ drugId }: { drugId: string }) {
  const { data: interactions, isLoading } = useDrugInteractions(drugId);

  if (isLoading) {
    return (
      <Box className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </Box>
    );
  }

  if (!interactions || interactions.length === 0) {
    return (
      <Box className="text-center text-muted-foreground py-8">
        <ShieldAlert className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No known drug interactions documented</p>
      </Box>
    );
  }

  return (
    <Box className="space-y-2">
      {interactions.map((interaction) => (
        <Card key={interaction.id}>
          <CardContent className="p-3">
            <Flex align="start" gap="sm">
              <ShieldAlert
                className={cn(
                  "h-5 w-5 shrink-0",
                  interaction.severity === "contraindicated"
                    ? "text-destructive"
                    : interaction.severity === "major"
                      ? "text-orange-600"
                      : "text-yellow-600"
                )}
              />
              <Box className="flex-1">
                <Flex align="center" gap="sm">
                  <span className="font-medium">{interaction.drugBName}</span>
                  <Badge
                    variant={
                      interaction.severity === "contraindicated"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {interaction.severity}
                  </Badge>
                </Flex>
                <p className="text-sm text-muted-foreground mt-1">
                  {interaction.description}
                </p>
                {interaction.management && (
                  <p className="text-sm mt-2">
                    <span className="font-medium">Management:</span>{" "}
                    {interaction.management}
                  </p>
                )}
              </Box>
            </Flex>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

function DrugContraindicationsTab({ drugId }: { drugId: string }) {
  const { data: contraindications, isLoading } = useDrugContraindications(drugId);

  if (isLoading) {
    return (
      <Box className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </Box>
    );
  }

  if (!contraindications || contraindications.length === 0) {
    return (
      <Box className="text-center text-muted-foreground py-8">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No contraindications documented</p>
      </Box>
    );
  }

  return (
    <Box className="space-y-2">
      {contraindications.map((ci) => (
        <Card key={ci.id}>
          <CardContent className="p-3">
            <Flex align="start" gap="sm">
              <AlertCircle
                className={cn(
                  "h-5 w-5 shrink-0",
                  ci.isAbsolute ? "text-destructive" : "text-yellow-600"
                )}
              />
              <Box className="flex-1">
                <Flex align="center" gap="sm">
                  <span className="font-medium">{ci.condition}</span>
                  <Badge variant={ci.isAbsolute ? "destructive" : "secondary"}>
                    {ci.isAbsolute ? "Absolute" : "Relative"}
                  </Badge>
                </Flex>
                <p className="text-sm text-muted-foreground mt-1">
                  {ci.description}
                </p>
              </Box>
            </Flex>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

/**
 * DrugDetails with drugId - fetches data automatically
 */
export const DrugDetails = memo(function DrugDetails({
  drugId,
  className,
}: DrugDetailsProps) {
  const { data: drug, isLoading, error } = useDrug(drugId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Box className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error || !drug) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <Box className="text-center text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load drug details</p>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return <DrugDetailsFull drug={drug} className={className} />;
});

/**
 * DrugDetailsFull - when you already have the drug object
 */
export const DrugDetailsFull = memo(function DrugDetailsFull({
  drug,
  className,
}: DrugDetailsFullProps) {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Card className={className}>
      <CardHeader>
        <Flex align="center" justify="between">
          <CardTitle className="flex items-center gap-2">
            <Pill className="h-5 w-5" />
            {drug.genericName}
          </CardTitle>
          <Flex gap="sm">
            {drug.isFormulary && <Badge variant="default">Formulary</Badge>}
            {drug.schedule && (
              <Badge
                variant={drug.schedule.isControlled ? "destructive" : "secondary"}
              >
                {drug.schedule.code}
              </Badge>
            )}
          </Flex>
        </Flex>
        {drug.brandNames.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Brand names: {drug.brandNames.join(", ")}
          </p>
        )}
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full justify-start">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="dosing">Dosing</TabsTrigger>
            <TabsTrigger value="interactions">Interactions</TabsTrigger>
            <TabsTrigger value="contraindications">Contraindications</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>

          <Box className="mt-4">
            <TabsContent value="overview">
              <DrugOverview drug={drug} />
            </TabsContent>
            <TabsContent value="dosing">
              <DrugDosing drug={drug} />
            </TabsContent>
            <TabsContent value="interactions">
              <DrugInteractionsTab drugId={drug.id} />
            </TabsContent>
            <TabsContent value="contraindications">
              <DrugContraindicationsTab drugId={drug.id} />
            </TabsContent>
            <TabsContent value="storage">
              <DrugStorage drug={drug} />
            </TabsContent>
          </Box>
        </Tabs>
      </CardContent>
    </Card>
  );
});
