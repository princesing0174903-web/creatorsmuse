import logoAsset from "@/assets/creators-muse-logo.png.asset.json";
import { cn } from "@/lib/utils";

type Variant = "full" | "mark";

/**
 * Creator's Muse brand lockup. `full` renders the logo + wordmark PNG
 * (which already includes the "Creator's Muse" text). `mark` crops to
 * just the icon area for tight nav/footer spots.
 */
export function BrandLogo({
  variant = "full",
  className,
  imgClassName,
  showWordmark = false,
}: {
  variant?: Variant;
  className?: string;
  imgClassName?: string;
  /** Render a text wordmark next to the mark for accessibility/backup. */
  showWordmark?: boolean;
}) {
  if (variant === "mark") {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <span
          className={cn(
            "relative inline-block overflow-hidden rounded-md ring-1 ring-primary/30 shadow-glow",
            imgClassName ?? "size-7",
          )}
          aria-hidden="true"
        >
          <img
            src={logoAsset.url}
            alt=""
            className="absolute left-1/2 top-1/2 h-[220%] w-[220%] -translate-x-1/2 -translate-y-[38%] max-w-none object-contain"
            draggable={false}
          />
        </span>
        {showWordmark && (
          <span className="text-lg font-bold uppercase tracking-tighter">
            Creator&apos;s Muse
          </span>
        )}
      </span>
    );
  }

  return (
    <img
      src={logoAsset.url}
      alt="Creator's Muse"
      className={cn("h-10 w-auto select-none", imgClassName)}
      draggable={false}
    />
  );
}