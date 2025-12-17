import {
  Badge,
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@lazarus-life/ui-components";
import { AlertCircle, Check, ChevronDown, Globe } from "lucide-react";
import { useEffect } from "react";
import type { Realm } from "@/lib/api/realms";
import { useAuthStore } from "@/stores/authStore";
import { useRealmStore } from "@/stores/realmStore";

interface RealmSelectorProps {
  className?: string;
}

export function RealmSelector({ className }: RealmSelectorProps) {
  const { isRoot } = useAuthStore();
  const {
    currentRealm,
    realms,
    isGlobalMode,
    isLoading,
    error,
    fetchRealms,
    setCurrentRealm,
    clearRealm,
  } = useRealmStore();

  // Fetch realms on mount
  useEffect(() => {
    fetchRealms();
  }, [fetchRealms]);

  const handleSelectRealm = (realm: Realm) => {
    setCurrentRealm(realm);
  };

  const handleSelectGlobal = () => {
    clearRealm();
  };

  // Display text for the dropdown trigger
  const displayText = isGlobalMode ? "Global" : currentRealm?.name || "Select Realm";

  return (
    <div className={cn("w-full", className)}>
      <TooltipProvider>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="max-w-[calc(16rem-1.5rem)] justify-between text-left font-normal"
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Globe className="h-4 w-4 shrink-0" />
                    <span className="truncate min-w-0">{displayText}</span>
                    {isGlobalMode && isRoot() && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        Admin
                      </Badge>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>{displayText}</p>
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent
            className="max-w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)]"
            align="end"
            side="bottom"
            sideOffset={4}
          >
            {/* Global option - only for root users */}
            {isRoot() && (
              <>
                <DropdownMenuItem onClick={handleSelectGlobal} className="cursor-pointer">
                  <div className="flex items-center justify-between ">
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="h-4 w-4 shrink-0" />
                      <span className="break-words">Global</span>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        All Realms
                      </Badge>
                    </div>
                    {isGlobalMode && <Check className="h-4 w-4 shrink-0" />}
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Loading state */}
            {isLoading && (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                Loading realms...
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="px-2 py-2 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="break-words">{error}</span>
              </div>
            )}

            {/* Realm list */}
            {!isLoading && realms.length === 0 && !error && (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No realms available
              </div>
            )}

            {!isLoading &&
              realms.map((realm) => (
                <DropdownMenuItem
                  key={realm.id}
                  onClick={() => handleSelectRealm(realm)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full gap-2 min-w-0">
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="font-medium break-words">{realm.name}</span>
                      {realm.organization_name && (
                        <span className="text-xs text-muted-foreground break-words">
                          {realm.organization_name}
                        </span>
                      )}
                    </div>
                    {currentRealm?.id === realm.id && <Check className="h-4 w-4 shrink-0" />}
                  </div>
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipProvider>

      {/* Warning indicator for global mode */}
      {isGlobalMode && isRoot() && (
        <div className="mt-2 px-2 py-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 rounded border border-amber-200 dark:border-amber-800">
          <AlertCircle className="h-3 w-3 inline mr-1" />
          Global mode: Changes affect all realms
        </div>
      )}
    </div>
  );
}
