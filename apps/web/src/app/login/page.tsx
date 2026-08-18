"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoginInput, loginSchema, UserRole } from "@eventful/contracts";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { useAuth } from "@/lib/auth/auth-context";

const ROLE_HOME_PATH: Record<UserRole, string> = {
  [UserRole.CUSTOMER]: "/",
  [UserRole.ORGANIZER]: "/organizer/events",
  [UserRole.GATE]: "/gate",
};

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    setError(null);
    try {
      const user = await login(values.email, values.password);
      router.push(ROLE_HOME_PATH[user.role]);
    } catch (submitError) {
      setError(submitError);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8 px-6 py-16">
      <div>
        <p className="font-ticket text-xs uppercase tracking-[0.2em] text-marquee">Admit one</p>
        <h1 className="font-display text-4xl font-bold uppercase text-paper">Log in</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        <ApiErrorNotice error={error} />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging in…" : "Log in"}
        </Button>
      </form>
    </div>
  );
}
