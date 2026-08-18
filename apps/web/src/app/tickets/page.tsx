"use client";

import { PAGINATION_DEFAULTS, UserRole } from "@eventful/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TicketCard } from "@/components/ticket-card";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AuthGuard } from "@/lib/auth/auth-guard";
import { listMyTickets } from "@/lib/tickets/tickets-api";

function MyTicketsList() {
  const [page, setPage] = useState<number>(PAGINATION_DEFAULTS.PAGE);
  const { data, isPending, error } = useQuery({
    queryKey: ["my-tickets", page],
    queryFn: () => listMyTickets(page, PAGINATION_DEFAULTS.PAGE_SIZE),
  });

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
      <div>
        <p className="font-ticket text-xs uppercase tracking-[0.2em] text-marquee">Admit one</p>
        <h1 className="font-display text-5xl font-bold uppercase leading-none text-paper">
          My tickets
        </h1>
      </div>

      <ApiErrorNotice error={error} />

      {isPending ? (
        <p className="text-ink-500">Loading your tickets…</p>
      ) : (
        <TicketsResults data={data} onPageChange={setPage} />
      )}
    </div>
  );
}

function TicketsResults({
  data,
  onPageChange,
}: {
  data: Awaited<ReturnType<typeof listMyTickets>> | undefined;
  onPageChange: (page: number) => void;
}) {
  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        title="No tickets yet"
        description="Reserve a seat or a spot in the pit, confirm payment, and your ticket shows up here."
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {data.data.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
      <Pagination meta={data.meta} onPageChange={onPageChange} />
    </>
  );
}

export default function MyTicketsPage() {
  return (
    <AuthGuard allow={[UserRole.CUSTOMER]}>
      <MyTicketsList />
    </AuthGuard>
  );
}
