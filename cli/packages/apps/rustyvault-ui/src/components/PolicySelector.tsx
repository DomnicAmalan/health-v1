import { Badge, Button, Label, Select, SelectItem, SelectValue } from "@lazarus-life/ui-components";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import { policiesApi } from "@/lib/api";
import { useRealmStore } from "@/stores/realmStore";

interface PolicySelectorProps {
  selectedPolicies: string[];
  onPoliciesChange: (policies: string[]) => void;
  /** Override realm ID (defaults to current realm from store) */
  realmId?: string;
  /** Label to show above the selector */
  label?: string;
  /** Whether to use global mode (ignore realm) */
  useGlobalMode?: boolean;
}

/**
 * Multi-select policy selector using dropdown
 * Fetches available policies from the current realm
 */
export function PolicySelector({
  selectedPolicies,
  onPoliciesChange,
  realmId: overrideRealmId,
  label = "Policies",
  useGlobalMode = false,
}: PolicySelectorProps) {
  const { currentRealm, isGlobalMode: storeIsGlobalMode } = useRealmStore();
  const [selectValue, setSelectValue] = useState("");

  const effectiveRealmId = overrideRealmId ?? currentRealm?.id;
  const effectiveIsGlobal = useGlobalMode || storeIsGlobalMode;

  // Fetch available policies based on realm context
  const {
    data: policiesData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["policies", effectiveRealmId, effectiveIsGlobal],
    queryFn: () =>
      effectiveRealmId && !effectiveIsGlobal
        ? policiesApi.listForRealm(effectiveRealmId)
        : policiesApi.list(),
  });

  const availablePolicies = policiesData?.keys || [];
  
  // Filter out already selected policies from dropdown options
  const unselectedPolicies = availablePolicies.filter(
    (p) => !selectedPolicies.includes(p)
  );

  const handleAddPolicy = (policy: string) => {
    if (policy && !selectedPolicies.includes(policy)) {
      onPoliciesChange([...selectedPolicies, policy]);
      setSelectValue(""); // Reset dropdown
    }
  };

  const handleRemovePolicy = (policy: string) => {
    onPoliciesChange(selectedPolicies.filter((p) => p !== policy));
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2 text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading policies...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex items-center gap-2 text-destructive py-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">Failed to load policies</span>
        </div>
      </div>
    );
  }

  if (availablePolicies.length === 0) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <p className="text-sm text-muted-foreground py-2">
          No policies available. Create a policy first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">{label}</Label>
      
      {/* Dropdown to add policies */}
      <Select
        value={selectValue}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
          const value = e.target.value;
          if (value) {
            handleAddPolicy(value);
          }
        }}
        className="w-full"
      >
        <SelectValue placeholder="Select a policy to add..." />
        {unselectedPolicies.map((policy) => (
          <SelectItem key={policy} value={policy}>
            {policy}
          </SelectItem>
        ))}
      </Select>

      {/* Selected policies as badges */}
      {selectedPolicies.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {selectedPolicies.map((policy) => {
              const isAdmin = policy === "admin" || policy === "root";
              const isDefault = policy === "default";
              return (
                <Badge
                  key={policy}
                  variant={isAdmin ? "destructive" : isDefault ? "outline" : "secondary"}
                  className="flex items-center gap-1 pr-1"
                >
                  {policy}
                  <button
                    type="button"
                    onClick={() => handleRemovePolicy(policy)}
                    className="ml-1 hover:bg-black/10 rounded p-0.5"
                    aria-label={`Remove ${policy}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              );
            })}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {selectedPolicies.length}{" "}
              {selectedPolicies.length === 1 ? "policy" : "policies"} selected
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => onPoliciesChange([])}
            >
              Clear all
            </Button>
          </div>
        </div>
      )}
      
      {selectedPolicies.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No policies selected. Use the dropdown above to add policies.
        </p>
      )}
    </div>
  );
}
