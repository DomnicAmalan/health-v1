/**
 * Accessibility Panel
 * Main accessibility settings panel
 */

import { useTranslation } from "@lazarus-life/shared/i18n";
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Separator,
  Stack,
} from "@lazarus-life/ui-components";
import { Settings } from "lucide-react";
import { useDisclosure } from "@/hooks/ui/useDisclosure";
import { useAccessibilityStore } from "@/stores/accessibilityStore";
import { ColorBlindModeSelector } from "./ColorBlindModeSelector";
import { FontSizeSelector } from "./FontSizeSelector";
import { HighContrastToggle } from "./HighContrastToggle";
import { VoiceCommandButton } from "./VoiceCommandButton";
import { VoiceSelector } from "./VoiceSelector";

interface AccessibilityPanelProps {
  showTrigger?: boolean;
}

export function AccessibilityPanel({ showTrigger = false }: AccessibilityPanelProps) {
  const { t } = useTranslation();
  const { isOpen, onClose, onToggle } = useDisclosure("accessibility-panel");
  const preferences = useAccessibilityStore((state) => state.preferences);
  const resetPreferences = useAccessibilityStore((state) => state.resetPreferences);

  return (
    <Dialog open={isOpen} onOpenChange={onToggle}>
      {showTrigger && (
        <DialogTrigger asChild={true}>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("accessibility.openAccessibilitySettings")}
            title={t("accessibility.accessibilitySettings")}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("accessibility.accessibilitySettings")}</DialogTitle>
        </DialogHeader>

        <Stack spacing="lg" className="mt-4">
          {/* Visual Accessibility */}
          <Box>
            <h3 className="text-lg font-semibold mb-4">{t("accessibility.visualAccessibility")}</h3>
            <Stack spacing="md">
              <HighContrastToggle />
              <FontSizeSelector />
              <ColorBlindModeSelector />
            </Stack>
          </Box>

          <Separator />

          {/* Voice Commands */}
          <Box>
            <h3 className="text-lg font-semibold mb-4">{t("accessibility.voiceCommands")}</h3>
            <Stack spacing="md">
              <Box className="flex items-center justify-between">
                <label htmlFor="voice-enabled" className="text-sm">
                  {t("accessibility.enableVoiceCommands")}
                </label>
                <input
                  id="voice-enabled"
                  type="checkbox"
                  checked={preferences.voiceCommandsEnabled}
                  onChange={(e) =>
                    useAccessibilityStore
                      .getState()
                      .updatePreference("voiceCommandsEnabled", e.target.checked)
                  }
                  className="h-4 w-4"
                />
              </Box>
              {preferences.voiceCommandsEnabled && (
                <>
                  <Box className="flex items-center gap-2">
                    <VoiceCommandButton />
                    <span className="text-xs text-muted-foreground">
                      {t("accessibility.clickToStartStopVoice")}
                    </span>
                  </Box>
                  <Separator />
                  <VoiceSelector />
                </>
              )}
            </Stack>
          </Box>

          <Separator />

          {/* Screen Reader */}
          <Box>
            <h3 className="text-lg font-semibold mb-4">{t("accessibility.screenReader")}</h3>
            <Stack spacing="sm">
              <Box className="flex items-center justify-between">
                <label htmlFor="screen-reader-optimized" className="text-sm">
                  {t("accessibility.screenReaderOptimized")}
                </label>
                <input
                  id="screen-reader-optimized"
                  type="checkbox"
                  checked={preferences.screenReaderOptimized}
                  onChange={(e) =>
                    useAccessibilityStore
                      .getState()
                      .updatePreference("screenReaderOptimized", e.target.checked)
                  }
                  className="h-4 w-4"
                />
              </Box>
              <Box className="flex items-center justify-between">
                <label htmlFor="announce-changes" className="text-sm">
                  {t("accessibility.announcePageChanges")}
                </label>
                <input
                  id="announce-changes"
                  type="checkbox"
                  checked={preferences.announcePageChanges}
                  onChange={(e) =>
                    useAccessibilityStore
                      .getState()
                      .updatePreference("announcePageChanges", e.target.checked)
                  }
                  className="h-4 w-4"
                />
              </Box>
            </Stack>
          </Box>

          <Separator />

          {/* Actions */}
          <Box className="flex justify-end gap-2">
            <Button variant="outline" onClick={resetPreferences}>
              {t("common.resetToDefaults")}
            </Button>
            <Button onClick={onClose}>{t("common.close")}</Button>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
