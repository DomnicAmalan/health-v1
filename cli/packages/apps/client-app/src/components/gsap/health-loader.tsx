/**
 * HealthLoader Component
 * Pre-configured healthcare-themed dot loaders
 */

import { ComponentProps } from "react";
import { DotLoader } from "./dot-loader";
import { LOADER_PRESETS, type LoaderPresetKey } from "./loader-presets";
import { cn } from "@lazarus-life/ui-components/utils";

type HealthLoaderProps = {
  /** Preset animation to use */
  preset: LoaderPresetKey;
  /** Optional label to display */
  label?: string;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Color variant */
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "muted";
  /** Whether animation is playing */
  isPlaying?: boolean;
  /** Override duration (ms per frame) */
  duration?: number;
} & Omit<ComponentProps<"div">, "children">;

const SIZE_CLASSES = {
  sm: {
    container: "gap-0.5",
    dot: "size-1",
  },
  md: {
    container: "gap-0.5",
    dot: "size-1.5",
  },
  lg: {
    container: "gap-1",
    dot: "size-2",
  },
};

const VARIANT_CLASSES = {
  default: {
    bg: "bg-background",
    dot: "bg-muted-foreground/20 [&.active]:bg-foreground",
    text: "text-foreground",
  },
  primary: {
    bg: "bg-primary/10",
    dot: "bg-primary/20 [&.active]:bg-primary",
    text: "text-primary",
  },
  success: {
    bg: "bg-green-500/10",
    dot: "bg-green-500/20 [&.active]:bg-green-500",
    text: "text-green-600",
  },
  warning: {
    bg: "bg-amber-500/10",
    dot: "bg-amber-500/20 [&.active]:bg-amber-500",
    text: "text-amber-600",
  },
  danger: {
    bg: "bg-red-500/10",
    dot: "bg-red-500/20 [&.active]:bg-red-500",
    text: "text-red-600",
  },
  muted: {
    bg: "bg-muted",
    dot: "bg-muted-foreground/15 [&.active]:bg-muted-foreground",
    text: "text-muted-foreground",
  },
};

export function HealthLoader({
  preset,
  label,
  size = "md",
  variant = "default",
  isPlaying = true,
  duration,
  className,
  ...props
}: HealthLoaderProps) {
  const presetConfig = LOADER_PRESETS[preset];
  const sizeClasses = SIZE_CLASSES[size];
  const variantClasses = VARIANT_CLASSES[variant];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-3 rounded-md px-3 py-2",
        variantClasses.bg,
        className
      )}
      {...props}
    >
      <DotLoader
        frames={presetConfig.frames}
        duration={duration ?? presetConfig.duration}
        isPlaying={isPlaying}
        className={sizeClasses.container}
        dotClassName={cn(sizeClasses.dot, "rounded-sm", variantClasses.dot)}
      />
      {label && (
        <span className={cn("text-sm font-medium", variantClasses.text)}>
          {label}
        </span>
      )}
    </div>
  );
}

/** Quick loader for inline use */
export function InlineLoader({
  preset = "wave",
  variant = "muted",
  size = "sm",
  ...props
}: Partial<HealthLoaderProps>) {
  return (
    <HealthLoader
      preset={preset}
      variant={variant}
      size={size}
      className="bg-transparent px-0 py-0"
      {...props}
    />
  );
}

/** Full-page loading overlay */
export function PageLoader({
  preset = "heartbeat",
  label = "Loading...",
  variant = "primary",
  ...props
}: Partial<HealthLoaderProps>) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <HealthLoader
        preset={preset}
        label={label}
        variant={variant}
        size="lg"
        className="shadow-lg"
        {...props}
      />
    </div>
  );
}

/** Card/section loading state */
export function CardLoader({
  preset = "scanning",
  label = "Loading data...",
  variant = "muted",
  ...props
}: Partial<HealthLoaderProps>) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <HealthLoader
        preset={preset}
        label={label}
        variant={variant}
        size="md"
        {...props}
      />
    </div>
  );
}

/** Button loading state - replaces button content */
export function ButtonLoader({
  preset = "circular",
  size = "sm",
  ...props
}: Partial<HealthLoaderProps>) {
  return (
    <InlineLoader
      preset={preset}
      size={size}
      {...props}
    />
  );
}
