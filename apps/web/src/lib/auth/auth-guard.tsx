"use client";

import { UserRole } from "@eventful/contracts";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./auth-context";
import { resolveGuardDecision } from "./resolve-guard-decision";

const REDIRECT_PATH: Record<"redirect-login" | "redirect-forbidden", string> = {
  "redirect-login": "/login",
  "redirect-forbidden": "/",
};

export function AuthGuard({
  allow,
  children,
}: {
  allow: UserRole[];
  children: React.ReactNode;
}) {
  const { status, user } = useAuth();
  const router = useRouter();
  const decision = resolveGuardDecision(status, user?.role, allow);

  useEffect(() => {
    if (decision === "redirect-login" || decision === "redirect-forbidden") {
      router.replace(REDIRECT_PATH[decision]);
    }
  }, [decision, router]);

  if (decision !== "render") {
    return null;
  }

  return <>{children}</>;
}
