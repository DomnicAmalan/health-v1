/**
 * BedBoard Component
 * Visual bed status board showing bed availability across wards
 */

import { memo, useCallback, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from "@lazarus-life/ui-components";
import { useWards, useWardBeds, useBedOccupancy } from "@/hooks/api/departments";
import type { Bed, BedStatus, Ward } from "@lazarus-life/shared/types/departments";

interface BedCardProps {
  bed: Bed;
  onSelect?: (bed: Bed) => void;
}

const statusColors: Record<BedStatus, string> = {
  vacant: "bg-green-500",
  occupied: "bg-red-500",
  reserved: "bg-yellow-500",
  maintenance: "bg-gray-500",
  cleaning: "bg-blue-500",
  housekeeping: "bg-blue-400",
  blocked: "bg-purple-500",
};

const statusLabels: Record<BedStatus, string> = {
  vacant: "Vacant",
  occupied: "Occupied",
  reserved: "Reserved",
  maintenance: "Maintenance",
  cleaning: "Cleaning",
  housekeeping: "Housekeeping",
  blocked: "Blocked",
};

const BedCard = memo(function BedCard({ bed, onSelect }: BedCardProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => onSelect?.(bed)}
            className={`
              w-16 h-16 rounded-lg flex flex-col items-center justify-center
              text-white font-medium text-sm transition-transform hover:scale-105
              ${statusColors[bed.status]}
              ${bed.status === "vacant" ? "cursor-pointer" : "cursor-default"}
            `}
          >
            <span className="text-xs opacity-80">Bed</span>
            <span>{bed.bedCode}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-semibold">{bed.bedCode}</p>
            <p>Status: {statusLabels[bed.status]}</p>
            <p>Type: {bed.bedType.replace("_", " ")}</p>
            {bed.currentPatientId && <p>Patient assigned</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

interface WardBedSectionProps {
  ward: Ward;
  onBedSelect?: (bed: Bed) => void;
}

const WardBedSection = memo(function WardBedSection({
  ward,
  onBedSelect,
}: WardBedSectionProps) {
  const { data: bedsData, isLoading } = useWardBeds(ward.id);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{ward.wardName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={`skeleton-${ward.id}-${i}`} className="w-16 h-16 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const beds = bedsData ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{ward.wardName}</CardTitle>
            <CardDescription>
              {ward.availableBeds} of {ward.totalBeds} beds available
            </CardDescription>
          </div>
          <Badge variant={ward.status === "active" ? "default" : "secondary"}>
            {ward.specialty.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {beds.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No beds configured for this ward
          </p>
        ) : (
          <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {beds.map((bed) => (
              <BedCard key={bed.id} bed={bed} onSelect={onBedSelect} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

interface BedBoardProps {
  onBedSelect?: (bed: Bed) => void;
  selectedWardId?: string;
}

export const BedBoard = memo(function BedBoard({
  onBedSelect,
  selectedWardId,
}: BedBoardProps) {
  const [filterWard, setFilterWard] = useState<string>(selectedWardId ?? "all");
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);

  const { data: wardsData, isLoading: wardsLoading } = useWards();
  const { data: occupancyData } = useBedOccupancy();

  const handleBedSelect = useCallback(
    (bed: Bed) => {
      if (bed.status === "vacant") {
        setSelectedBed(bed);
        onBedSelect?.(bed);
      }
    },
    [onBedSelect]
  );

  const wards = wardsData?.data ?? [];
  const filteredWards =
    filterWard === "all" ? wards : wards.filter((w: Ward) => w.id === filterWard);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {occupancyData?.available ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {occupancyData?.occupied ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Occupied</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {occupancyData?.reserved ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Reserved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {occupancyData?.occupancyRate?.toFixed(1) ?? 0}%
            </div>
            <p className="text-sm text-muted-foreground">Occupancy Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {Object.entries(statusLabels).map(([status, label]) => (
              <div key={status} className="flex items-center gap-2">
                <div
                  className={`w-4 h-4 rounded ${statusColors[status as BedStatus]}`}
                />
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <Select value={filterWard} onValueChange={setFilterWard}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by ward" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Wards</SelectItem>
            {wards.map((ward) => (
              <SelectItem key={ward.id} value={ward.id}>
                {ward.wardName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bed Grid by Ward */}
      {wardsLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`ward-skeleton-${i}`} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredWards.map((ward) => (
            <WardBedSection
              key={ward.id}
              ward={ward}
              onBedSelect={handleBedSelect}
            />
          ))}
        </div>
      )}

      {/* Bed Details Dialog */}
      <Dialog open={!!selectedBed} onOpenChange={() => setSelectedBed(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bed {selectedBed?.bedCode}</DialogTitle>
            <DialogDescription>
              {selectedBed?.bedType.replace("_", " ")} bed
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">
                  {selectedBed && statusLabels[selectedBed.status]}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ward</p>
                <p className="font-medium">
                  {wards.find((w) => w.id === selectedBed?.wardId)?.wardName}
                </p>
              </div>
            </div>
            {selectedBed?.status === "vacant" && (
              <Button className="w-full" onClick={() => setSelectedBed(null)}>
                Allocate Bed
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default BedBoard;
