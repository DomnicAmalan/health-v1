/**
 * Patients List Route
 * Displays searchable list of patients
 */

import { PERMISSIONS } from "@lazarus-life/shared/constants/permissions";
import { useTranslation } from "@lazarus-life/shared/i18n";
import {
  Box,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Flex,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lazarus-life/ui-components";

const Spinner = () => (
  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
);
import { cn } from "@lazarus-life/ui-components/utils";
import { createFileRoute, useNavigate, Outlet, useMatches } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  User,
  Users,
} from "lucide-react";
import { useState, useCallback } from "react";
import { ProtectedRoute } from "@/components/security/ProtectedRoute";
import { useEhrPatients, useEhrPatientSearch } from "@/hooks/api/ehr";
import { useDebounce } from "@/hooks/useDebounce";
import { useOpenTab, useTabStore } from "@/stores/tabStore";

export const Route = createFileRoute("/patients")({
  component: PatientsRouteComponent,
});

function PatientsRouteComponent() {
  const matches = useMatches();
  const hasChildRoute = matches.some(match => match.id.includes('/$patientId'));

  return (
    <ProtectedRoute requiredPermission={PERMISSIONS.PATIENTS.VIEW} resource="patients">
      {!hasChildRoute && <PatientsPage />}
      <Outlet />
    </ProtectedRoute>
  );
}

function PatientsPage() {
  const { t: _t } = useTranslation();
  const navigate = useNavigate();
  const openTab = useOpenTab();
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Use search when there's a search term, otherwise use list
  const { data: searchResults, isLoading: isSearching } = useEhrPatientSearch(
    { name: debouncedSearch },
    debouncedSearch.length >= 2
  );

  const { data: listResults, isLoading: isListing } = useEhrPatients({
    limit: pageSize,
    offset: page * pageSize,
  });

  const isSearchMode = debouncedSearch.length >= 2;
  const isLoading = isSearchMode ? isSearching : isListing;
  const patients = isSearchMode ? searchResults?.items : listResults?.items;
  const totalPatients = isSearchMode ? searchResults?.total : listResults?.total;

  // Debug logging
  console.log('Patients data:', patients);
  if (patients && patients.length > 0) {
    console.log('First patient:', patients[0]);
    console.log('First patient ID:', patients[0]?.id);
  }

  const handleSelectPatient = useCallback(
    (patientId: string, patientName: string, patientMrn: string) => {
      console.log('Patient clicked! ID:', patientId);
      console.log('Opening patient tab:', patientName);

      openTab({
        label: `${patientName} | Patient (${patientMrn})`,
        path: `/patients/${patientId}`,
        icon: <User className="h-4 w-4" />,
        closable: true,
        groupId: "patients",
        groupType: "module",
        groupLabel: "Patients",
        groupColor: "#3B82F6", // Blue for patients
        patientId: patientId,
        patientName: patientName,
        requiredPermission: PERMISSIONS.PATIENTS.VIEW,
      }, (path) => navigate({ to: path as "/" | (string & {}) }));
    },
    [openTab, navigate]
  );

  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Box className="space-y-6" role="main" aria-label="Patients list">
      {/* Header */}
      <Flex align="center" justify="between">
        <Box>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8" />
            Patients
          </h1>
          <p className="text-muted-foreground mt-1">
            Search and manage patient records
          </p>
        </Box>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Patient
        </Button>
      </Flex>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <Box className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, MRN, or date of birth..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              className="pl-10"
            />
          </Box>
          {debouncedSearch.length > 0 && debouncedSearch.length < 2 && (
            <p className="text-sm text-muted-foreground mt-2">
              Type at least 2 characters to search
            </p>
          )}
        </CardContent>
      </Card>

      {/* Patient List */}
      <Card>
        <CardHeader>
          <Flex align="center" justify="between">
            <CardTitle>
              {isSearchMode
                ? `Search Results ${totalPatients ? `(${totalPatients})` : ""}`
                : `All Patients ${totalPatients ? `(${totalPatients})` : ""}`}
            </CardTitle>
            {!isSearchMode && totalPatients && totalPatients > pageSize && (
              <Flex gap="sm" align="center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {Math.ceil(totalPatients / pageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * pageSize >= totalPatients}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Flex>
            )}
          </Flex>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Flex align="center" justify="center" className="py-12">
              <Spinner />
              <span className="ml-2 text-muted-foreground">Loading patients...</span>
            </Flex>
          ) : !patients || patients.length === 0 ? (
            <Box className="text-center py-12 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">
                {isSearchMode
                  ? `No patients found matching "${debouncedSearch}"`
                  : "No patients found"}
              </p>
              {isSearchMode && (
                <p className="text-sm mt-2">Try adjusting your search terms</p>
              )}
            </Box>
          ) : (
            <Box className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>Date of Birth</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Sex</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow
                      key={patient.id}
                      className="cursor-pointer hover:bg-accent/50"
                      onClick={() => handleSelectPatient(patient.id, `${patient.lastName}, ${patient.firstName}`, patient.mrn || patient.id)}
                    >
                      <TableCell>
                        <Flex align="center" gap="sm">
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
                          <Box>
                            <p className="font-medium">
                              {patient.lastName}, {patient.firstName}
                              {patient.middleName && ` ${patient.middleName[0]}.`}
                            </p>
                          </Box>
                        </Flex>
                      </TableCell>
                      <TableCell className="font-mono">{patient.mrn}</TableCell>
                      <TableCell>{formatDate(patient.dateOfBirth)}</TableCell>
                      <TableCell>{calculateAge(patient.dateOfBirth)}</TableCell>
                      <TableCell>
                        <Badge variant={patient.gender === "male" ? "default" : "secondary"}>
                          {patient.gender === "male" ? "Male" : "Female"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {patient.city && patient.state
                          ? `${patient.city}, ${patient.state}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={patient.status === "active" ? "default" : "secondary"}
                        >
                          {patient.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
