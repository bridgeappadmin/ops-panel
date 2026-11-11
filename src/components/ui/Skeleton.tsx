/** A placeholder block; size it with className (`h-5 w-64`). Compose these into the shape of what's loading. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-sm bg-mist motion-reduce:animate-none ${className}`} />;
}
