/**
 * DrugSearchSelect Component
 * Autocomplete search and select component for drugs
 */

import type { Drug, DrugSearchQuery } from "@lazarus-life/shared/types/ehr";
import {
  Box,
  Badge,
  Button,
  Flex,
  Input,
} from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import { Check, ChevronsUpDown, Loader2, Pill, Search, X } from "lucide-react";
import { memo, useState, useCallback, useEffect, useRef } from "react";
import { useDrugSearch, useActiveDrugCatalog } from "@/hooks/api/pharmacy";
import { useDebounce } from "@/hooks/useDebounce";

interface DrugSearchSelectProps {
  value?: Drug | null;
  onSelect: (drug: Drug | null) => void;
  catalogId?: string;
  formularyOnly?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const DrugSearchSelect = memo(function DrugSearchSelect({
  value,
  onSelect,
  catalogId,
  formularyOnly = true,
  placeholder = "Search for a drug...",
  disabled = false,
  className,
}: DrugSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 300);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get active catalog if not provided
  const { data: activeCatalog } = useActiveDrugCatalog();
  const effectiveCatalogId = catalogId || activeCatalog?.id;

  const searchParams: DrugSearchQuery = {
    q: debouncedQuery,
    catalogId: effectiveCatalogId,
    isFormulary: formularyOnly ? true : undefined,
    pageSize: 20,
  };

  const { data: searchResults, isLoading } = useDrugSearch(searchParams);

  const handleSelect = useCallback(
    (drug: Drug) => {
      onSelect(drug);
      setOpen(false);
      setSearchQuery("");
    },
    [onSelect]
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(null);
      setSearchQuery("");
    },
    [onSelect]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  // Reset search when dropdown closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  return (
    <Box ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <Button
        variant="outline"
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full justify-between font-normal",
          !value && "text-muted-foreground"
        )}
      >
        {value ? (
          <Flex align="center" gap="sm" className="flex-1 min-w-0">
            <Pill className="h-4 w-4 shrink-0" />
            <span className="truncate">{value.genericName}</span>
            {value.strength && (
              <Badge variant="secondary" className="text-xs shrink-0">
                {value.strength}
              </Badge>
            )}
          </Flex>
        ) : (
          <span>{placeholder}</span>
        )}
        {value ? (
          <X
            className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
            onClick={handleClear}
          />
        ) : (
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        )}
      </Button>

      {/* Dropdown */}
      {open && (
        <Box className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg">
          {/* Search Input */}
          <Box className="p-2 border-b">
            <Flex align="center" gap="sm">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Type to search..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="border-0 focus-visible:ring-0 p-0 h-8"
                autoFocus
              />
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            </Flex>
          </Box>

          {/* Results */}
          <Box className="max-h-[300px] overflow-y-auto">
            {debouncedQuery.length < 2 ? (
              <Box className="p-4 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </Box>
            ) : isLoading ? (
              <Box className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </Box>
            ) : searchResults?.data.length === 0 ? (
              <Box className="p-4 text-center text-sm text-muted-foreground">
                No drugs found matching &quot;{debouncedQuery}&quot;
              </Box>
            ) : (
              <Box className="py-1">
                {searchResults?.data.map((drug) => (
                  <Box
                    key={drug.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent",
                      value?.id === drug.id && "bg-accent"
                    )}
                    onClick={() => handleSelect(drug)}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value?.id === drug.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <Box className="flex-1 min-w-0">
                      <Flex align="center" gap="sm">
                        <span className="font-medium truncate">
                          {drug.genericName}
                        </span>
                        {drug.isFormulary && (
                          <Badge variant="secondary" className="text-xs">
                            Formulary
                          </Badge>
                        )}
                      </Flex>
                      <Flex gap="sm" className="text-xs text-muted-foreground">
                        {drug.strength && <span>{drug.strength}</span>}
                        <span className="capitalize">{drug.form}</span>
                        {drug.brandNames.length > 0 && (
                          <span className="truncate">
                            ({drug.brandNames.slice(0, 2).join(", ")})
                          </span>
                        )}
                      </Flex>
                    </Box>
                    {drug.schedule && (
                      <Badge
                        variant={drug.schedule.isControlled ? "destructive" : "outline"}
                        className="text-xs shrink-0"
                      >
                        {drug.schedule.code}
                      </Badge>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {searchResults && searchResults.total > searchResults.data.length && (
            <Box className="p-2 border-t text-center text-xs text-muted-foreground">
              Showing {searchResults.data.length} of {searchResults.total} results
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
});
