import { createFileRoute, isRedirect, redirect } from "@tanstack/react-router";
import { OAuthCallbackScreen } from "@/components/auth/oauth-callback-screen";
import {
  completeOAuthCallback,
  consumeAuthErrorMessage,
  stashAuthError,
} from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;

    try {
      const session = await completeOAuthCallback();
      if (session?.user) {
        throw redirect({ to: "/dashboard", replace: true });
      }
      stashAuthError("Sign-in could not be completed. Please try again.");
    } catch (error) {
      if (isRedirect(error)) throw error;
      const message =
        error instanceof Error ? error.message : "Sign-in failed. Please try again.";
      stashAuthError(message);
    }

    throw redirect({ to: "/login", replace: true });
  },
  component: AuthCallbackPage,
  head: () => ({
    meta: [{ title: "Signing in — Creator's Muse" }],
  }),
});

function AuthCallbackPage() {
  // beforeLoad redirects on success/failure; this is only a brief fallback shell.
  void consumeAuthErrorMessage();
  return <OAuthCallbackScreen />;
}
