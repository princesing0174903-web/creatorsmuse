/** Full-screen silent loader — no text, no JSON, no debug output. */
export function OAuthCallbackScreen() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background"
      aria-busy="true"
      aria-label="Signing in"
    >
      <div className="size-6 animate-pulse rounded-full bg-primary/70 shadow-glow" />
    </div>
  );
}
