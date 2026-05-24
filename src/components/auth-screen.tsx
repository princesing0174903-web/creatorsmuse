/** Minimal full-screen state for auth hydration and OAuth callback — no forms or dev chrome. */
export function AuthScreen({ message = "Loading…" }: { message?: string }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="size-7 animate-pulse rounded-md bg-primary/75" aria-hidden />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
