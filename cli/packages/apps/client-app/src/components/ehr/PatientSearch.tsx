/**
 * PatientSearch Component
 * Search and select patients with typeahead
 */

import type { EhrPatient } from "@lazarus-life/shared/types/ehr";
import { Box, Input } from "@lazarus-life/ui-components";
import { cn } from "@lazarus-life/ui-components/utils";
import { Check, Search, User, X } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { useEhrPatientSearch } from "@/hooks/api/ehr";
import { useDebounce } from "@/hooks/useDebounce";

const Spinner = () => (
  <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
);

interface PatientSearchProps {
  value?: string;
  onSelect: (patient: EhrPatient) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PatientSearch({
  value,
  onSelect,
  placeholder = "Search patients...",
  disabled = false,
  className,
}: PatientSearchProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: searchResults, isLoading } = useEhrPatientSearch(
    { name: debouncedSearch },
    debouncedSearch.length >= 2
  );

  const handleSelect = useCallback(
    (patient: EhrPatient) => {
      onSelect(patient);
      setOpen(false);
      setSearchTerm("");
    },
    [onSelect]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const patients = searchResults?.items ?? [];

  return (
    <Box className={cn("relative", className)}>
      <Box className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm || value || ""}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        {(searchTerm || value) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm("");
              setOpen(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </Box>

      {open && debouncedSearch.length >= 2 && (
        <Box
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-auto"
        >
          {isLoading && (
            <Box className="p-4 text-center">
              <Spinner />
              <p className="text-sm text-muted-foreground mt-2">Searching...</p>
            </Box>
          )}

          {!isLoading && patients.length === 0 && (
            <Box className="p-4 text-center text-muted-foreground">
              <p>No patients found</p>
            </Box>
          )}

          {!isLoading && patients.length > 0 && (
            <Box className="py-1">
              {patients.map((patient) => (
                <button
                  key={patient.id}
                  type="button"
                  onClick={() => handleSelect(patient)}
                  className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-3"
                >
                  <Box
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                      patient.gender === "male"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-pink-100 text-pink-700"
                    )}
                  >
                    {patient.firstName[0]}
                    {patient.lastName[0]}
                  </Box>
                  <Box className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {patient.lastName}, {patient.firstName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      DOB: {new Date(patient.dateOfBirth).toLocaleDateString()} | MRN: {patient.mrn}
                    </p>
                  </Box>
                  {value === `${patient.lastName}, ${patient.firstName}` && (
                    <Check className="h-4 w-4 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

/**
 * PatientSearchDialog - Full screen patient search
 */
interface PatientSearchDialogProps {
  onSelect: (patient: EhrPatient) => void;
  onClose: () => void;
}

export function PatientSearchDialog({ onSelect, onClose }: PatientSearchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);

  const { data: searchResults, isLoading } = useEhrPatientSearch(
    { name: debouncedSearch },
    debouncedSearch.length >= 2
  );

  const patients = searchResults?.items ?? [];

  return (
    <Box className="flex flex-col h-full">
      {/* Search Header */}
      <Box className="p-4 border-b">
        <Box className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, MRN, SSN, or date of birth..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
        </Box>
      </Box>

      {/* Results */}
      <Box className="flex-1 overflow-auto p-4">
        {isLoading && (
          <Box className="flex items-center justify-center h-32">
            <Spinner />
            <span className="ml-2 text-muted-foreground">Searching...</span>
          </Box>
        )}

        {!isLoading && debouncedSearch.length < 2 && (
          <Box className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <User className="h-12 w-12 mb-2" />
            <p>Enter at least 2 characters to search</p>
          </Box>
        )}

        {!isLoading && debouncedSearch.length >= 2 && patients.length === 0 && (
          <Box className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Search className="h-12 w-12 mb-2" />
            <p>No patients found matching "{debouncedSearch}"</p>
          </Box>
        )}

        {!isLoading && patients.length > 0 && (
          <Box className="space-y-2">
            {patients.map((patient) => (
              <button
                key={patient.id}
                type="button"
                onClick={() => {
                  onSelect(patient);
                  onClose();
                }}
                className="w-full p-4 border rounded-lg hover:bg-accent transition-colors text-left flex items-center gap-4"
              >
                <Box
                  className={cn(
                    "h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0",
                    patient.gender === "male"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-pink-100 text-pink-700"
                  )}
                >
                  {patient.firstName[0]}
                  {patient.lastName[0]}
                </Box>
                <Box className="flex-1 min-w-0">
                  <p className="font-semibold text-lg">
                    {patient.lastName}, {patient.firstName}
                    {patient.middleName && ` ${patient.middleName}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    DOB: {new Date(patient.dateOfBirth).toLocaleDateString()} |{" "}
                    {patient.gender === "male" ? "Male" : patient.gender === "female" ? "Female" : patient.gender} | MRN: {patient.mrn}
                  </p>
                  {patient.city && patient.state && (
                    <p className="text-sm text-muted-foreground">
                      {patient.city}, {patient.state}
                    </p>
                  )}
                </Box>
              </button>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
