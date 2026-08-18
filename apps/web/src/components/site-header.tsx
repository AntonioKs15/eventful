"use client";

import { UserRole } from "@eventful/contracts";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { getUnreadCount } from "@/lib/notifications/notifications-api";

interface NavLink {
  href: string;
  label: string;
}

const PRIMARY_NAV_LINKS: NavLink[] = [
  { href: "/", label: "Movies" },
  { href: "/discover", label: "Discover" },
  { href: "/actors", label: "Actors" },
];

const ROLE_NAV_LINKS: Record<UserRole, NavLink[]> = {
  [UserRole.CUSTOMER]: [{ href: "/tickets", label: "My tickets" }],
  [UserRole.ORGANIZER]: [
    { href: "/organizer/movies", label: "My movies" },
    { href: "/organizer/events", label: "My showtimes" },
  ],
  [UserRole.GATE]: [{ href: "/gate", label: "Gate" }],
};

const UNREAD_POLL_INTERVAL_MS = 30_000;

function NotificationsLink() {
  const { data } = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: getUnreadCount,
    refetchInterval: UNREAD_POLL_INTERVAL_MS,
  });

  return (
    <Link
      href="/notifications"
      className="focus-ring relative text-surface-400 transition-colors hover:text-foreground"
      aria-label="Notifications"
    >
      <Bell className="h-5 w-5" />
      {data && data.count > 0 ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-white">
          {data.count}
        </span>
      ) : null}
    </Link>
  );
}

export function SiteHeader() {
  const { status, user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  const navLinks = user ? ROLE_NAV_LINKS[user.role] : [];

  return (
    <header className="border-b border-surface-700 bg-surface-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-display text-2xl font-bold tracking-wide text-accent">
          Eventful
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          {PRIMARY_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-surface-400 transition-colors hover:text-foreground focus-ring"
            >
              {link.label}
            </Link>
          ))}
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-surface-400 transition-colors hover:text-foreground focus-ring"
            >
              {link.label}
            </Link>
          ))}

          {status === "authenticated" && user ? (
            <div className="flex items-center gap-4 border-l border-surface-700 pl-6">
              <NotificationsLink />
              <span className="font-ticket text-xs text-surface-500">{user.name}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="focus-ring rounded-full border border-surface-700 px-4 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="gradient-cta focus-ring rounded-full px-4 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
