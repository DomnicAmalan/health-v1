/**
 * PatientActions Component
 * Modern ribbon-style action bar for patient operations
 * Inspired by Microsoft Office/Google Sheets menu design
 */

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lazarus-life/ui-components";
import {
  Edit3,
  FileText,
  Calendar,
  Pill,
  Beaker,
  Printer,
  Download,
  RefreshCw,
  Copy,
  MoreVertical,
  Eye,
  ChevronDown,
} from "lucide-react";
import { memo } from "react";

interface PatientActionsProps {
  onEdit?: () => void;
  onNewNote?: () => void;
  onSchedule?: () => void;
  onViewResults?: () => void;
  onViewMedications?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  onDuplicate?: () => void;
  className?: string;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  variant?: "default" | "ghost";
}

function ActionButton({ icon, label, onClick, variant = "ghost" }: ActionButtonProps) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          onClick={onClick}
          className="flex flex-col items-center justify-center h-14 w-16 px-2 py-1 gap-0.5 hover:bg-accent/50 transition-colors"
        >
          <span className="text-base">{icon}</span>
          <span className="text-[10px] font-normal leading-tight text-center">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export const PatientActions = memo(function PatientActions({
  onEdit,
  onNewNote,
  onSchedule,
  onViewResults,
  onViewMedications,
  onPrint,
  onExport,
  onRefresh,
  onDuplicate,
  className,
}: PatientActionsProps) {
  return (
    <div
      className={`flex items-center gap-0.5 px-2 py-1 border-b bg-gradient-to-b from-background to-muted/20 ${className || ""}`}
    >
      {/* Edit Group */}
      <ActionButton icon={<Edit3 className="h-4 w-4" />} label="Edit" onClick={onEdit} />

      <Separator orientation="vertical" className="h-10 mx-1" />

      {/* Clinical Actions Group */}
      <ActionButton
        icon={<FileText className="h-4 w-4" />}
        label="New Note"
        onClick={onNewNote}
      />
      <ActionButton
        icon={<Calendar className="h-4 w-4" />}
        label="Schedule"
        onClick={onSchedule}
      />

      <Separator orientation="vertical" className="h-10 mx-1" />

      {/* View Group */}
      <DropdownMenu>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-col items-center justify-center h-14 w-16 px-2 py-1 gap-0.5 hover:bg-accent/50 transition-colors"
              >
                <Eye className="h-4 w-4" />
                <span className="text-[10px] font-normal leading-tight flex items-center gap-0.5">
                  View
                  <ChevronDown className="h-3 w-3" />
                </span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            View Options
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={onViewResults}>
            <Beaker className="mr-2 h-4 w-4" />
            View Results
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onViewMedications}>
            <Pill className="mr-2 h-4 w-4" />
            View Medications
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-10 mx-1" />

      {/* Export Group */}
      <ActionButton icon={<Printer className="h-4 w-4" />} label="Print" onClick={onPrint} />
      <ActionButton
        icon={<Download className="h-4 w-4" />}
        label="Export"
        onClick={onExport}
      />

      <Separator orientation="vertical" className="h-10 mx-1" />

      {/* Utility Group */}
      <ActionButton
        icon={<RefreshCw className="h-4 w-4" />}
        label="Refresh"
        onClick={onRefresh}
      />
      <ActionButton
        icon={<Copy className="h-4 w-4" />}
        label="Duplicate"
        onClick={onDuplicate}
      />

      {/* More Actions */}
      <DropdownMenu>
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center justify-center h-14 w-10 px-2 hover:bg-accent/50 transition-colors ml-auto"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            More Actions
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onEdit}>
            <Edit3 className="mr-2 h-4 w-4" />
            Edit Patient Details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onPrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Chart
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExport}>
            <Download className="mr-2 h-4 w-4" />
            Export to PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate Tab
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
