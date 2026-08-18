"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function BookingSuccessPage() {
  const searchParams = useSearchParams();
  const ticketIds = (searchParams.get("tickets") ?? "").split(",").filter(Boolean);
  const singleTicketId = ticketIds.length === 1 ? ticketIds[0] : null;

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-6 px-6 py-24 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-positive/15">
        <CheckCircle2 className="h-10 w-10 text-positive" />
      </div>
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">Booking successful.</h1>
        <p className="mt-2 text-surface-400">Thank you for your purchase!</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <Link
          href="/"
          className="gradient-cta focus-ring rounded-full px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          Discover more
        </Link>
        <Link
          href={singleTicketId ? `/tickets/${singleTicketId}` : "/tickets"}
          className="focus-ring rounded-full border border-surface-700 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
        >
          View my ticket{ticketIds.length === 1 ? "" : "s"}
        </Link>
      </div>
    </div>
  );
}
