import { UserRole } from "@eventful/contracts";
import { resolveGuardDecision } from "./resolve-guard-decision";

describe("resolveGuardDecision", () => {
  it("waits while the session is still loading, regardless of allowed roles", () => {
    expect(resolveGuardDecision("loading", undefined, [UserRole.ORGANIZER])).toBe("loading");
  });

  it("sends an anonymous visitor to log in", () => {
    expect(resolveGuardDecision("anonymous", undefined, [UserRole.ORGANIZER])).toBe(
      "redirect-login",
    );
  });

  it("renders the route when the user's role is allowed", () => {
    expect(
      resolveGuardDecision("authenticated", UserRole.ORGANIZER, [UserRole.ORGANIZER]),
    ).toBe("render");
  });

  it("renders when any of several allowed roles matches", () => {
    expect(
      resolveGuardDecision("authenticated", UserRole.GATE, [UserRole.ORGANIZER, UserRole.GATE]),
    ).toBe("render");
  });

  it("redirects an authenticated user whose role is not allowed on this route", () => {
    expect(
      resolveGuardDecision("authenticated", UserRole.CUSTOMER, [UserRole.ORGANIZER]),
    ).toBe("redirect-forbidden");
  });
});
