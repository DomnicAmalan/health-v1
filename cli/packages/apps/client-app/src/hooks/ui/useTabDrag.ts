import { useRef } from "react";

interface UseTabDragOptions {
  isDraggable: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onSelect: () => void;
}

export function useTabDrag({ isDraggable, onDragStart, onSelect }: UseTabDragOptions) {
  const mouseDownRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingRef = useRef(false);
  const startEventRef = useRef<React.MouseEvent | null>(null);
  const handledByMouseDownRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Ignore if clicking the close button
    if ((e.target as HTMLElement).closest("button")) {
      return;
    }

    if (!isDraggable) {
      return;
    }

    startEventRef.current = e;
    mouseDownRef.current = {
      x: e.clientX,
      y: e.clientY,
    };
    isDraggingRef.current = false;
    handledByMouseDownRef.current = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!mouseDownRef.current || !startEventRef.current) {
        return;
      }

      const deltaX = Math.abs(moveEvent.clientX - mouseDownRef.current.x);
      const deltaY = Math.abs(moveEvent.clientY - mouseDownRef.current.y);
      const threshold = 5; // pixels

      // If mouse moved more than threshold, start dragging
      if (deltaX > threshold || deltaY > threshold) {
        isDraggingRef.current = true;
        // Pass the original mouse down event for proper offset calculation
        onDragStart(startEventRef.current);
        mouseDownRef.current = null;
        startEventRef.current = null;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      }
    };

    const handleMouseUp = () => {
      // If we didn't drag, treat it as a click
      if (!isDraggingRef.current && mouseDownRef.current) {
        // No time check - if mouse didn't move, it's a click
        handledByMouseDownRef.current = true;
        onSelect();
      }
      mouseDownRef.current = null;
      startEventRef.current = null;
      isDraggingRef.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);

      // Reset the flag after a short delay (after onClick would have fired)
      setTimeout(() => {
        handledByMouseDownRef.current = false;
      }, 0);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click if it was already handled by mouseDown logic
    if (handledByMouseDownRef.current || isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // If not handled by mouseDown (shouldn't happen), call onSelect
    onSelect();
  };

  return { handleMouseDown, handleClick };
}
