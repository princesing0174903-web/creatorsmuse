import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[a-zA-Z]/, "Password must include at least one letter")
  .regex(/[0-9]/, "Password must include at least one number");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const signUpSchema = z.object({
  name: z.string().trim().max(80, "Name is too long").optional(),
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function fieldErrors<T extends Record<string, unknown>>(
  result: z.SafeParseReturnType<T, T>,
): Partial<Record<keyof T, string>> {
  if (result.success) return {};
  const out: Partial<Record<keyof T, string>> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof T;
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
