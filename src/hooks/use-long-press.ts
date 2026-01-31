import { useCallback, useRef } from "react";

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delay?: number;
  moveThreshold?: number;
}

export function useLongPress({
  onLongPress,
  onClick,
  delay = 500,
  moveThreshold = 10,
}: UseLongPressOptions) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const start = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isLongPressRef.current = false;
    
    // Record starting position
    if ('touches' in e) {
      startPosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    } else {
      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
    }
    
    timeoutRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress();
    }, delay);
  }, [onLongPress, delay]);

  const move = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!startPosRef.current || !timeoutRef.current) return;

    let currentX: number;
    let currentY: number;

    if ('touches' in e) {
      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;
    } else {
      currentX = e.clientX;
      currentY = e.clientY;
    }

    const deltaX = Math.abs(currentX - startPosRef.current.x);
    const deltaY = Math.abs(currentY - startPosRef.current.y);

    // If moved beyond threshold, cancel long press
    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [moveThreshold]);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    startPosRef.current = null;
  }, []);

  const handleClick = useCallback(() => {
    // Only trigger onClick if it wasn't a long press
    if (!isLongPressRef.current && onClick) {
      onClick();
    }
    isLongPressRef.current = false;
  }, [onClick]);

  return {
    onMouseDown: start,
    onMouseUp: clear,
    onMouseLeave: clear,
    onMouseMove: move,
    onTouchStart: start,
    onTouchEnd: clear,
    onTouchMove: move,
    onClick: handleClick,
  };
}