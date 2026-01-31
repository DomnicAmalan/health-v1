/**
 * WardList Component
 * Ward management list with census information
 */

import { memo, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Progress,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Skeleton,
} from "@lazarus-life/ui-components";
import { useWards, useAllWardsCensus } from "@/hooks/api/departments";
import type { Ward, WardCensus, WardSpecialty, WardStatus } from "@lazarus-life/shared/types/departments";

const specialtyLabels: Record<WardSpecialty, string> = {
  general_medicine: "General Medicine",
  general_surgery: "General Surgery",
  pediatrics: "Pediatrics",
  obstetrics: "Obstetrics",
  gynecology: "Gynecology",
  orthopedics: "Orthopedics",
  cardiology: "Cardiology",
  neurology: "Neurology",
  oncology: "Oncology",
  nephrology: "Nephrology",
  psychiatry: "Psychiatry",
  icu: "ICU",
  nicu: "NICU",
  picu: "PICU",
  ccu: "CCU",
  emergency: "Emergency",
  burn: "Burns",
  isolation: "Isolation",
  other: "Other",
};

const statusVariants: Record<WardStatus, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  inactive: "secondary",
  maintenance: "outline",
  closed: "destructive",
};

interface WardRowProps {
  ward: Ward;
  census?: WardCensus;
  onViewDetails: (ward: Ward) => void;
}

const WardRow = memo(function WardRow({ ward, census, onViewDetails }: WardRowProps) {
  const occupancyRate = census?.occupancyRate ??
    (ward.totalBeds > 0 ? ((ward.totalBeds - ward.availableBeds) / ward.totalBeds) * 100 : 0);

  const getOccupancyColor = (rate: number) => {
    if (rate < 60) return "bg-green-500";
    if (rate < 80) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <TableRow>
      <TableCell>
        <div>
          <p className="font-medium">{ward.wardName}</p>
          <p className="text-sm text-muted-foreground">{ward.wardCode}</p>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{specialtyLabels[ward.specialty]}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={statusVariants[ward.status]}>
          {ward.status.charAt(0).toUpperCase() + ward.status.slice(1)}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>
              {ward.totalBeds - ward.availableBeds} / {ward.totalBeds}
            </span>
            <span className="text-muted-foreground">
              {occupancyRate.toFixed(0)}%
            </span>
          </div>
          <Progress
            value={occupancyRate}
            className="h-2"
            indicatorClassName={getOccupancyColor(occupancyRate)}
          />
        </div>
      </TableCell>
      <TableCell className="text-center">
        <span className="font-medium text-green-600">{ward.availableBeds}</span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(ward)}
          >
            View
          </Button>
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
});

interface WardDetailsDialogProps {
  ward: Ward | null;
  census?: WardCensus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WardDetailsDialog = memo(function WardDetailsDialog({
  ward,
  census,
  open,
  onOpenChange,
}: WardDetailsDialogProps) {
  if (!ward) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{ward.wardName}</DialogTitle>
          <DialogDescription>
            Ward Code: {ward.wardCode} | {specialtyLabels[ward.specialty]}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* Status and Info */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={statusVariants[ward.status]} className="text-lg">
                  {ward.status.charAt(0).toUpperCase() + ward.status.slice(1)}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Floor</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{ward.floorNumber}</p>
              </CardContent>
            </Card>
          </div>

          {/* Bed Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Bed Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{ward.totalBeds}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {census?.occupied ?? ward.totalBeds - ward.availableBeds}
                  </p>
                  <p className="text-sm text-muted-foreground">Occupied</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {ward.availableBeds}
                  </p>
                  <p className="text-sm text-muted-foreground">Available</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-yellow-600">
                    {census?.reserved ?? 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Reserved</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {ward.description && (
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{ward.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button>View Beds</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

interface WardListProps {
  onWardSelect?: (ward: Ward) => void;
}

export const WardList = memo(function WardList({ onWardSelect }: WardListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWard, setSelectedWard] = useState<Ward | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: wardsData, isLoading } = useWards();
  const { data: censusData } = useAllWardsCensus();

  const handleViewDetails = useCallback((ward: Ward) => {
    setSelectedWard(ward);
    setDialogOpen(true);
    onWardSelect?.(ward);
  }, [onWardSelect]);

  const wards = wardsData?.data ?? [];
  const censusByWard = new Map(
    censusData?.wards?.map((c) => [c.wardId, c]) ?? []
  );

  const filteredWards = wards.filter(
    (ward: Ward) =>
      ward.wardName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ward.wardCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Summary stats
  const totalBeds = wards.reduce((sum, w: Ward) => sum + w.totalBeds, 0);
  const availableBeds = wards.reduce((sum, w: Ward) => sum + w.availableBeds, 0);
  const occupancyRate = totalBeds > 0 ? ((totalBeds - availableBeds) / totalBeds) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{wards.length}</div>
            <p className="text-sm text-muted-foreground">Total Wards</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalBeds}</div>
            <p className="text-sm text-muted-foreground">Total Beds</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{availableBeds}</div>
            <p className="text-sm text-muted-foreground">Available Beds</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{occupancyRate.toFixed(1)}%</div>
            <p className="text-sm text-muted-foreground">Occupancy Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search wards..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Button>Add Ward</Button>
      </div>

      {/* Ward Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={`row-skeleton-${i}`} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredWards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No wards found matching your search" : "No wards configured"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ward</TableHead>
                  <TableHead>Specialty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Occupancy</TableHead>
                  <TableHead className="text-center">Available</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWards.map((ward) => (
                  <WardRow
                    key={ward.id}
                    ward={ward}
                    census={censusByWard.get(ward.id)}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Ward Details Dialog */}
      <WardDetailsDialog
        ward={selectedWard}
        census={selectedWard ? censusByWard.get(selectedWard.id) : undefined}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
});

export default WardList;
