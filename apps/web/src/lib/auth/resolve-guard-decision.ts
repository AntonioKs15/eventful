import { UserRole } from "@eventful/contracts";

export type AuthStatus = "loading" | "authenticated" | "anonymous";
export type GuardDecision = "loading" | "redirect-login" | "redirect-forbidden" | "render";

export function resolveGuardDecision(
  status: AuthStatus,
  userRole: UserRole | undefined,
  allowedRoles: UserRole[],
): GuardDecision {
  if (status === "loading") {
    return "loading";
  }

  if (status === "anonymous") {
    return "redirect-login";
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    return "redirect-forbidden";
  }

  return "render";
}
