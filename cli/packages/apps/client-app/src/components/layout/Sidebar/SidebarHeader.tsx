import { useTranslation } from "@lazarus-life/shared/i18n";
import { Button } from "@lazarus-life/ui-components";
import { ChevronLeft } from "lucide-react";
import { Flex } from "@/components/ui/flex";

interface SidebarHeaderProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function SidebarHeader({ isCollapsed, onToggle }: SidebarHeaderProps) {
  const { t } = useTranslation();

  return (
    <Flex className="items-center justify-between p-4 border-b shrink-0">
      {isCollapsed ? (
        <Flex className="items-center justify-center w-full">
          <img src="/logo-main.png" alt={t("branding.appName")} className="h-8 w-8 shrink-0" />
        </Flex>
      ) : (
        <>
          <Flex className="items-center gap-2 min-w-0">
            <img src="/logo-main.png" alt={t("branding.appName")} className="h-8 w-8 shrink-0" />
            <h2 className="text-lg font-semibold truncate">{t("branding.appName")}</h2>
          </Flex>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="shrink-0"
            title={t("common.close")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </>
      )}
    </Flex>
  );
}
