/**
 * ServiceSearch Component
 * Searchable dropdown for selecting billing services
 */

import type { Service } from "@lazarus-life/shared/types/billing";
import {
  Box,
  Badge,
  Button,
  Flex,
  Input,
} from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import { Check, Loader2, Plus, Search, X } from "lucide-react";
import { memo, useState, useCallback, useRef, useEffect } from "react";
import { useSearchServices, useServices } from "@/hooks/api/billing";

interface ServiceSearchProps {
  value?: Service | null;
  onSelect: (service: Service | null) => void;
  placeholder?: string;
  categoryId?: string;
  className?: string;
}

export const ServiceSearch = memo(function ServiceSearch({
  value,
  onSelect,
  placeholder = "Search for a service...",
  categoryId,
  className,
}: ServiceSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: searchResults, isLoading: searchLoading } = useSearchServices(search);
  const { data: allServices, isLoading: listLoading } = useServices({ categoryId });

  const services = search.length >= 2 ? searchResults?.data : allServices?.data;
  const isLoading = search.length >= 2 ? searchLoading : listLoading;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = useCallback(
    (service: Service) => {
      onSelect(service);
      setOpen(false);
      setSearch("");
    },
    [onSelect]
  );

  const handleClear = useCallback(() => {
    onSelect(null);
    setSearch("");
  }, [onSelect]);

  return (
    <Box ref={containerRef} className={cn("relative", className)}>
      {value ? (
        <Box className="flex items-center gap-2 p-2 border rounded-md bg-background">
          <Box className="flex-1 min-w-0">
            <p className="font-medium truncate">{value.name}</p>
            <Flex gap="xs" className="text-sm text-muted-foreground">
              <span>{value.code}</span>
              <span>-</span>
              <span>
                {value.baseCurrencyCode} {value.basePrice.toFixed(2)}
              </span>
            </Flex>
          </Box>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </Box>
      ) : (
        <Box className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setSearch(e.target.value);
              if (!open) setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="pl-9"
          />
        </Box>
      )}

      {open && !value && (
        <Box className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {isLoading ? (
            <Flex justify="center" align="center" className="p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </Flex>
          ) : services && services.length > 0 ? (
            <Box className="py-1">
              {services.map((service) => (
                <Box
                  key={service.id}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent",
                    !service.isActive && "opacity-50"
                  )}
                  onClick={() => handleSelect(service)}
                >
                  <Box className="flex-1 min-w-0">
                    <Flex align="center" gap="sm">
                      <span className="font-medium truncate">{service.name}</span>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {service.serviceType}
                      </Badge>
                    </Flex>
                    <Flex gap="xs" className="text-sm text-muted-foreground">
                      <span className="font-mono">{service.code}</span>
                      <span>-</span>
                      <span>
                        {service.baseCurrencyCode} {service.basePrice.toFixed(2)}
                      </span>
                      {service.taxCode && (
                        <Badge variant="outline" className="text-xs">
                          {service.taxCode}
                        </Badge>
                      )}
                    </Flex>
                  </Box>
                  <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                </Box>
              ))}
            </Box>
          ) : search.length >= 2 ? (
            <Box className="p-4 text-center text-muted-foreground">
              No services found for "{search}"
            </Box>
          ) : (
            <Box className="p-4 text-center text-muted-foreground">
              Type at least 2 characters to search
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
});

interface ServiceSelectListProps {
  services: Service[];
  selectedIds: string[];
  onToggle: (serviceId: string) => void;
  className?: string;
}

export const ServiceSelectList = memo(function ServiceSelectList({
  services,
  selectedIds,
  onToggle,
  className,
}: ServiceSelectListProps) {
  return (
    <Box className={cn("space-y-1", className)}>
      {services.map((service) => {
        const isSelected = selectedIds.includes(service.id);
        return (
          <Box
            key={service.id}
            className={cn(
              "flex items-center gap-3 p-2 border rounded-md cursor-pointer transition-colors",
              isSelected ? "border-primary bg-primary/5" : "hover:bg-accent"
            )}
            onClick={() => onToggle(service.id)}
          >
            <Box
              className={cn(
                "w-5 h-5 rounded border flex items-center justify-center shrink-0",
                isSelected ? "bg-primary border-primary" : "border-muted-foreground"
              )}
            >
              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
            </Box>
            <Box className="flex-1 min-w-0">
              <p className="font-medium truncate">{service.name}</p>
              <p className="text-sm text-muted-foreground font-mono">{service.code}</p>
            </Box>
            <Box className="text-right shrink-0">
              <p className="font-medium">
                {service.baseCurrencyCode} {service.basePrice.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">{service.unit}</p>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
});
