import { Lock, Key, CheckCircle2 } from 'lucide-react';

interface UnsealLockProps {
  progress: number;  // Keys entered so far
  threshold: number; // Keys needed to unseal
  total: number;     // Total keys available (for display)
}

export function UnsealLock({ progress, threshold, total }: UnsealLockProps) {
  const isUnlocked = progress >= threshold;
  const remaining = Math.max(0, threshold - progress);

  // Calculate positions for key slots in a circle around the lock
  const getKeySlotPosition = (index: number, total: number, radius = 60) => {
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2; // Start from top
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  return (
    <div className="flex flex-col items-center justify-center py-6">
      {/* Lock Icon with Key Slots */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Central Lock Icon */}
        <div className="relative z-10">
          {isUnlocked ? (
            <Lock className="h-16 w-16 text-green-600 transition-all duration-300" style={{ transform: 'rotate(0deg)' }} />
          ) : (
            <Lock className="h-16 w-16 text-destructive transition-all duration-300" />
          )}
        </div>

        {/* Key Slots arranged in a circle */}
        {Array.from({ length: threshold }).map((_, index) => {
          const isFilled = index < progress;
          const position = getKeySlotPosition(index, threshold, 70);
          
          return (
            <div
              key={`key-slot-${index}`}
              className="absolute z-20 transition-all duration-300"
              style={{
                left: `calc(50% + ${position.x}px)`,
                top: `calc(50% + ${position.y}px)`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {isFilled ? (
                <div className="relative">
                  <CheckCircle2 className="h-8 w-8 text-green-600 animate-in fade-in duration-300" />
                  <Key className="h-4 w-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
              ) : (
                <div className="relative">
                  <div className="h-8 w-8 rounded-full border-2 border-muted-foreground bg-background flex items-center justify-center">
                    <Key className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Progress Text */}
      <div className="mt-4 text-center">
        <p className="text-lg font-semibold">
          {isUnlocked ? (
            <span className="text-green-600">Vault Unlocked!</span>
          ) : (
            <span>
              {progress} of {threshold} keys entered
            </span>
          )}
        </p>
        {!isUnlocked && remaining > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {remaining} more {remaining === 1 ? 'key' : 'keys'} needed
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Total keys available: {total}
        </p>
      </div>
    </div>
  );
}
