import { useTranslation } from "@lazarus-life/shared/i18n";
import { Box } from "@/components/ui/box";

interface SidebarFooterProps {
  isCollapsed: boolean;
}

export function SidebarFooter({ isCollapsed }: SidebarFooterProps) {
  const { t } = useTranslation();

  if (isCollapsed) return null;

  return (
    <Box className="p-4 border-t shrink-0">
      <Box className="text-xs text-muted-foreground text-center">
        {t("branding.hipaaCompliant")}
      </Box>
    </Box>
  );
}
