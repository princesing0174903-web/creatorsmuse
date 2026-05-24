import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ensureAuthReady, recoverSessionFromHash, updatePassword } from "@/lib/auth";
import { fieldErrors, resetPasswordSchema } from "@/lib/auth-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
  head: () => ({
    meta: [{ title: "New password — Creator's Muse" }],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(true);
  const [done, setDone] = useState(false);
  const submitting = useRef(false);

  useEffect(() => {
    void (async () => {
      try {
        await ensureAuthReady();
        const session = await recoverSessionFromHash();
        setValidLink(!!session);
        if (!session) {
          toast.error("This reset link is invalid or has expired.");
        }
      } catch {
        setValidLink(false);
        toast.error("This reset link is invalid or has expired.");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting.current || !validLink) return;

    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    const nextErrors = fieldErrors(parsed);
    setErrors(nextErrors);
    if (!parsed.success) return;

    submitting.current = true;
    setLoading(true);
    try {
      await updatePassword(parsed.data.password);
      setDone(true);
      toast.success("Password updated. You can sign in with your new password.");
      setTimeout(() => navigate({ to: "/dashboard", replace: true }), 1200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update password";
      toast.error(message);
    } finally {
      setLoading(false);
      submitting.current = false;
    }
  };

  if (!ready) {
    return (
      <AuthLayout title="New password" description="Verifying your secure reset link." loading />
    );
  }

  if (!validLink) {
    return (
      <AuthLayout title="Link expired" description="Request a new password reset to continue.">
        <Button asChild className="h-11 w-full">
          <Link to="/forgot-password">Request new link</Link>
        </Button>
        <Button asChild variant="ghost" className="mt-2 h-11 w-full">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="You're all set" description="Redirecting you to your dashboard.">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="size-10 text-primary" />
          <p className="text-sm text-muted-foreground">Password updated successfully.</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" description="Use at least 8 characters with letters and numbers.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
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

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (errors.confirmPassword) {
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }
            }}
            className="h-11 border-border bg-background/60"
            aria-invalid={!!errors.confirmPassword}
          />
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword}</p>
          )}
        </div>

        <Button type="submit" disabled={loading} className="h-11 w-full shadow-glow">
          {loading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Update password
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
