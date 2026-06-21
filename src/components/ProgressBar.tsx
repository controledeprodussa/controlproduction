import { cn } from "@/lib/utils";

export function ProgressBar({ value, className, indicatorClassName }: { value: number; className?: string; indicatorClassName?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full rounded-full bg-secondary overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full bg-primary transition-[width] duration-500 ease-out", indicatorClassName)}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}
