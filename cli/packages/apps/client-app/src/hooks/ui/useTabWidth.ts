import { useEffect, useState, type RefObject } from "react";

/**
 * Debounce helper function
 */
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

interface TabWidthState {
  tabWidth: number;
  hasOverflow: boolean;
  scrollLeft: number;
  showRightFade: boolean;
}

/**
 * Hook to calculate dynamic tab width based on container size and tab count.
 * Implements Chrome-like tab compression: 180px max, 100px min.
 */
export function useTabWidth(
  tabCount: number,
  containerRef: RefObject<HTMLElement | null>
): TabWidthState {
  const [state, setState] = useState<TabWidthState>({
    tabWidth: 180,
    hasOverflow: false,
    scrollLeft: 0,
    showRightFade: false,
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      const container = containerRef.current;
      if (!container) return;

      // Calculate available width (container - user menu - padding)
      const availableWidth = container.clientWidth - 200; // ~200px for user menu
      const idealWidth = Math.max(
        100,
        Math.min(180, availableWidth / tabCount)
      );
      const hasOverflow = container.scrollWidth > container.clientWidth;
      const scrollLeft = container.scrollLeft;
      const showRightFade =
        hasOverflow &&
        scrollLeft < container.scrollWidth - container.clientWidth - 10;

      setState({ tabWidth: idealWidth, hasOverflow, scrollLeft, showRightFade });
    };

    // Initial calculation
    updateWidth();

    // Observe container resize
    const debouncedUpdate = debounce(updateWidth, 100);
    const observer = new ResizeObserver(debouncedUpdate);
    observer.observe(containerRef.current);

    // Listen to scroll events for fade indicators
    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const hasOverflow = container.scrollWidth > container.clientWidth;
      const scrollLeft = container.scrollLeft;
      const showRightFade =
        hasOverflow &&
        scrollLeft < container.scrollWidth - container.clientWidth - 10;

      setState((prev) => ({
        ...prev,
        scrollLeft,
        showRightFade,
      }));
    };

    containerRef.current.addEventListener("scroll", handleScroll);
    const currentContainer = containerRef.current;

    return () => {
      observer.disconnect();
      currentContainer?.removeEventListener("scroll", handleScroll);
    };
  }, [tabCount, containerRef]);

  return state;
}
