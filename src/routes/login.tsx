import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google sign-in failed";
      toast.error(message);
      submitting.current = false;
      setGoogleLoading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
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
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
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
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </Tabs>
    </AuthLayout>
  );
}
