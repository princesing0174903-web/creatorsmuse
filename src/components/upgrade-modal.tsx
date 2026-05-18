import { Link } from "@tanstack/react-router";
import { Sparkles, X, Check } from "lucide-react";
import { PLANS } from "@/lib/plan";

export function UpgradeModal({
  open,
  onClose,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  reason?: string;
}) {
  if (!open) return null;
  const pro = PLANS.find((p) => p.id === "pro")!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        <div className="p-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
            <Sparkles className="size-3" /> Premium
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Upgrade to unlock more.</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {reason ?? "You've hit a free-plan limit. Upgrade to keep shipping at AI speed."}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {pro.features.slice(0, 4).map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="text-foreground/90">{f}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              From <span className="text-foreground">${pro.yearlyPrice}/mo</span> billed yearly
            </p>
            <Link
              to="/pricing"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-glow hover:scale-[1.02] active:scale-[0.99]"
            >
              See plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}