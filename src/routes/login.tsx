import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
<<<<<<< HEAD
import { ArrowRight, Loader2, MailCheck } from "lucide-react";
import { AuthDivider, AuthLayout, GoogleIcon } from "@/components/auth/auth-layout";
import { redirectIfAuthenticated } from "@/lib/auth-guard";
import {
  consumeAuthErrorMessage,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/auth";
import { fieldErrors, signInSchema, signUpSchema } from "@/lib/auth-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  beforeLoad: redirectIfAuthenticated,
=======
import { ArrowRight, Loader2 } from "lucide-react";
import { AuthScreen } from "@/components/auth-screen";
import {
  isAuthCallbackUrl,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  waitForAuthHydration,
  getClientSession,
} from "@/lib/auth";
import { redirectIfAuthenticated } from "@/lib/route-auth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  beforeLoad: redirectIfAuthenticated,
  pendingComponent: () => <AuthScreen message="Signing in…" />,
  pendingMs: 0,
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — Creator's Muse" },
      {
        name: "description",
        content: "Sign in to your Creator's Muse AI workbench.",
      },
    ],
  }),
});

<<<<<<< HEAD
type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
};

function LoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    const message = consumeAuthErrorMessage();
    if (message) toast.error(message);
  }, []);

  const busy = loading || googleLoading;

  const handleGoogle = async () => {
    if (submitting.current || busy) return;
    submitting.current = true;
=======
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function LoginPage() {
  if (typeof window !== "undefined" && isAuthCallbackUrl()) {
    return <AuthScreen message="Completing sign-in…" />;
  }

  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const busy = submitting || googleLoading;
  const submitLock = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error_description") ?? params.get("error");
    if (oauthError) {
      setFieldError(oauthError);
      toast.error(oauthError);
    }
  }, []);

  const goToDashboard = async () => {
    await waitForAuthHydration();
    const session = await getClientSession();
    if (!session?.user) {
      setFieldError("Sign-in succeeded but session was not saved. Please try again.");
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  };

  const handleGoogle = async () => {
    if (busy || submitLock.current) return;
    setFieldError(null);
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed";
<<<<<<< HEAD
      toast.error(message);
      submitting.current = false;
=======
      setFieldError(message);
      toast.error(message);
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
      setGoogleLoading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
<<<<<<< HEAD
    if (submitting.current || busy) return;

    if (tab === "signin") {
      const parsed = signInSchema.safeParse({ email, password });
      const nextErrors = fieldErrors(parsed);
      setErrors(nextErrors);
      if (!parsed.success) return;

      submitting.current = true;
      setLoading(true);
      try {
        await signInWithEmail(parsed.data.email, parsed.data.password);
        navigate({ to: "/dashboard", replace: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sign in failed";
        toast.error(message);
      } finally {
        setLoading(false);
        submitting.current = false;
      }
      return;
    }

    const parsed = signUpSchema.safeParse({ name, email, password });
    const nextErrors = fieldErrors(parsed);
    setErrors(nextErrors);
    if (!parsed.success) return;

    submitting.current = true;
    setLoading(true);
    try {
      const displayName = parsed.data.name?.trim() || parsed.data.email.split("@")[0];
      const data = await signUpWithEmail(parsed.data.email, parsed.data.password, displayName);
      if (data.session) {
        toast.success("Welcome aboard!");
        navigate({ to: "/dashboard", replace: true });
      } else {
        setCheckEmail(true);
        toast.success("Confirm your email to finish signing up.");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign up failed";
      toast.error(message);
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  if (checkEmail) {
    return (
      <AuthLayout
        title="Check your inbox"
        description="We sent a confirmation link to activate your account."
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <MailCheck className="size-7 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Open the link we sent to{" "}
            <span className="font-medium text-foreground">{email}</span>, then return here to sign
            in.
          </p>
          <Button variant="outline" className="w-full" onClick={() => setCheckEmail(false)}>
            Back to sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={tab === "signin" ? "Welcome back" : "Create your account"}
      description={
        tab === "signin"
          ? "Sign in to your creator workbench."
          : "Start synthesizing content in under a minute."
      }
    >
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={handleGoogle}
        className="h-11 w-full border-border bg-background/60 hover:bg-secondary/80"
      >
        {googleLoading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <>
            <GoogleIcon className="size-4" />
            Continue with Google
          </>
        )}
      </Button>

      <AuthDivider />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          setTab(v as "signin" | "signup");
          setErrors({});
        }}
        className="w-full"
      >
        <TabsList className="mb-4 grid h-10 w-full grid-cols-2 bg-muted/60 p-1">
          <TabsTrigger value="signin" className="text-sm">
            Sign in
          </TabsTrigger>
          <TabsTrigger value="signup" className="text-sm">
            Sign up
          </TabsTrigger>
        </TabsList>

        <form onSubmit={submit} noValidate>
          <TabsContent value="signup" className="mt-0 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                className="h-11 border-border bg-background/60"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>
          </TabsContent>

          <div className="space-y-4">
=======
    if (busy || submitLock.current) return;
    if (!email.trim() || !password) {
      setFieldError("Enter your email and password.");
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    setFieldError(null);

    try {
      if (mode === "signup") {
        const displayName = name.trim() || email.split("@")[0];
        const { session } = await signUpWithEmail(email.trim(), password, displayName);
        if (!session) {
          toast.success("Check your email to confirm your account, then sign in.");
          setMode("signin");
          return;
        }
        toast.success("Account created — welcome!");
      } else {
        await signInWithEmail(email.trim(), password);
        toast.success("Welcome back!");
      }
      await goToDashboard();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed";
      setFieldError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
      submitLock.current = false;
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-gradient-radial" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <Link
        to="/"
        className="absolute left-6 top-6 z-10 flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <div className="size-7 rounded-md bg-primary shadow-glow" />
        <span className="font-semibold tracking-tight">Creator&apos;s Muse</span>
      </Link>

      <div className="relative z-10 w-full max-w-[400px] animate-fade-up">
        <div className="rounded-2xl border border-border/80 bg-card/90 p-8 shadow-elegant backdrop-blur-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-xl bg-primary/10 ring-1 ring-primary/25">
              <div className="size-4 rounded-sm bg-primary shadow-glow" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {mode === "signin"
                ? "One click to your creator workbench."
                : "Start generating in under a minute."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full gap-3 border-border/80 bg-background/50 text-sm font-medium"
            disabled={busy}
            onClick={() => void handleGoogle()}
          >
            {googleLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <GoogleIcon className="size-4" />
                Continue with Google
              </>
            )}
          </Button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/80" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-card px-3 text-muted-foreground">or email</span>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  disabled={busy}
                  className="h-11 bg-background/60"
                />
              </div>
            )}
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
<<<<<<< HEAD
                autoComplete="email"
                placeholder="you@creator.ai"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                className="h-11 border-border bg-background/60"
                aria-invalid={!!errors.email}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {tab === "signin" && (
                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                )}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete={tab === "signin" ? "current-password" : "new-password"}
                placeholder={tab === "signin" ? "Your password" : "Min. 8 characters"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                className="h-11 border-border bg-background/60"
                aria-invalid={!!errors.password}
              />
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <Button type="submit" disabled={busy} className="h-11 w-full shadow-glow">
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {tab === "signin" ? "Sign in" : "Create account"}
=======
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@creator.ai"
                autoComplete="email"
                disabled={busy}
                className="h-11 bg-background/60"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                disabled={busy}
                className="h-11 bg-background/60"
              />
            </div>

            {fieldError && (
              <p
                role="alert"
                className={cn(
                  "rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive",
                )}
              >
                {fieldError}
              </p>
            )}

            <Button
              type="submit"
              className="h-11 w-full gap-2 text-sm font-semibold shadow-glow"
              disabled={busy}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"}
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
<<<<<<< HEAD
          </div>
        </form>
      </Tabs>
    </AuthLayout>
=======
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setFieldError(null);
              }}
              className="font-medium text-primary hover:underline disabled:opacity-50"
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>

      </div>
    </div>
>>>>>>> 8b3e73a64e4aecaf4f76711263e13f7c325f65dc
  );
}
