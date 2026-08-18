"use client";

import { UserRole } from "@eventful/contracts";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

interface NavLink {
  href: string;
  label: string;
}

const ROLE_NAV_LINKS: Record<UserRole, NavLink[]> = {
  [UserRole.CUSTOMER]: [{ href: "/tickets", label: "My tickets" }],
  [UserRole.ORGANIZER]: [
    { href: "/organizer/events", label: "My events" },
    { href: "/organizer/events/new", label: "Create event" },
  ],
  [UserRole.GATE]: [{ href: "/gate", label: "Gate" }],
};

export function SiteHeader() {
  const { status, user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  const navLinks = user ? ROLE_NAV_LINKS[user.role] : [];

  return (
    <header className="border-b border-ink-700 bg-ink-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl font-bold uppercase tracking-wide text-marquee">
          Eventful
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          <Link href="/" className="text-ink-400 transition-colors hover:text-paper focus-ring">
            Browse events
          </Link>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-ink-400 transition-colors hover:text-paper focus-ring"
            >
              {link.label}
            </Link>
          ))}

          {status === "authenticated" && user ? (
            <div className="flex items-center gap-4 border-l border-ink-700 pl-6">
              <span className="font-ticket text-xs text-ink-500">{user.name}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="focus-ring rounded-full border border-ink-700 px-4 py-1.5 text-xs font-medium text-paper transition-colors hover:border-marquee hover:text-marquee"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="focus-ring rounded-full bg-marquee px-4 py-1.5 text-xs font-medium text-ink-950 transition-colors hover:bg-marquee-dim"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
