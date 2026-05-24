import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Loader2, MailCheck } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { redirectIfAuthenticated } from "@/lib/auth-guard";
import { sendPasswordReset } from "@/lib/auth";
import { fieldErrors, forgotPasswordSchema } from "@/lib/auth-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  beforeLoad: redirectIfAuthenticated,
  component: ForgotPasswordPage,
  head: () => ({
    meta: [{ title: "Reset password — Creator's Muse" }],
  }),
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const submitting = useRef(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting.current) return;

    const parsed = forgotPasswordSchema.safeParse({ email });
    const nextErrors = fieldErrors(parsed);
    setErrors(nextErrors);
    if (!parsed.success) return;

    submitting.current = true;
    setLoading(true);
    try {
      await sendPasswordReset(parsed.data.email);
      setSent(true);
      toast.success("Check your inbox for the reset link.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not send reset email";
      toast.error(message);
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title="Check your email"
        description="We sent a secure link to reset your password."
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <MailCheck className="size-7 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Open the link in <span className="font-medium text-foreground">{email}</span> to choose a
            new password. The link expires after a short time.
          </p>
          <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/login" })}>
            Back to sign in
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset password" description="We'll email you a secure reset link.">
      <form onSubmit={submit} className="space-y-4" noValidate>
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
              if (errors.email) setErrors({});
            }}
            className="h-11 border-border bg-background/60"
            aria-invalid={!!errors.email}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <Button type="submit" disabled={loading} className="h-11 w-full shadow-glow">
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Send reset link
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>

      <Link
        to="/login"
        className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Back to sign in
      </Link>
    </AuthLayout>
  );
}
