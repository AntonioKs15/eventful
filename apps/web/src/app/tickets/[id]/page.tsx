"use client";

import { UserRole } from "@eventful/contracts";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";
import { StatusPill } from "@/components/ui/status-pill";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { AuthGuard } from "@/lib/auth/auth-guard";
import { formatEventDate, formatEventTime } from "@/lib/format";
import { ticketStatusLabel, ticketStatusTone } from "@/lib/tickets/ticket-status-presentation";
import { getTicket, getTicketQr } from "@/lib/tickets/tickets-api";

function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  const ticketQuery = useQuery({ queryKey: ["ticket", id], queryFn: () => getTicket(id) });
  const qrQuery = useQuery({ queryKey: ["ticket-qr", id], queryFn: () => getTicketQr(id) });

  if (ticketQuery.isPending) {
    return <p className="mx-auto max-w-md px-6 py-16 text-ink-500">Loading your ticket…</p>;
  }

  if (!ticketQuery.data) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <ApiErrorNotice error={ticketQuery.error} />
      </div>
    );
  }

  const ticket = ticketQuery.data;
  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/tickets/share/${ticket.qrPublicCode}` : "";

  async function copyShareLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyGateCode() {
    if (!qrQuery.data) {
      return;
    }
    await navigator.clipboard.writeText(qrQuery.data.payload);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-6 py-16">
      <div className="ticket-stub rounded-2xl p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-ticket text-xs uppercase tracking-[0.15em] text-ink-950/60">
              {formatEventDate(ticket.event.startsAt)} · {formatEventTime(ticket.event.startsAt)}
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold uppercase leading-tight text-ink-950">
              {ticket.event.title}
            </h1>
            <p className="mt-1 text-sm text-ink-950/70">
              {ticket.event.venue.name} · {ticket.event.venue.city}
            </p>
          </div>
          <StatusPill tone={ticketStatusTone(ticket.status)} label={ticketStatusLabel(ticket.status)} />
        </div>

        <div className="ticket-perforation mt-5 flex flex-col items-center gap-3 pt-5">
          {qrQuery.data ? (
            <Image
              src={qrQuery.data.dataUrl}
              alt="Ticket QR code"
              width={192}
              height={192}
              unoptimized
              className="h-48 w-48"
            />
          ) : (
            <div className="flex h-48 w-48 items-center justify-center text-xs text-ink-950/50">
              Loading QR…
            </div>
          )}
          <p className="font-ticket text-xs text-ink-950/60">
            {ticket.seat ? `Seat ${ticket.seat.rowLabel}${ticket.seat.seatNumber}` : "General admission"}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={copyShareLink}
        className="focus-ring rounded-full border border-ink-700 px-4 py-2.5 text-sm text-paper transition-colors hover:border-marquee hover:text-marquee"
      >
        {copied ? "Link copied!" : "Copy share link"}
      </button>

      <button
        type="button"
        onClick={copyGateCode}
        disabled={!qrQuery.data}
        className="focus-ring rounded-full border border-ink-700 px-4 py-2.5 text-sm text-ink-500 transition-colors hover:border-marquee hover:text-marquee disabled:opacity-50"
      >
        {codeCopied ? "Gate code copied!" : "Copy gate code (manual entry)"}
      </button>
    </div>
  );
}

export default function TicketDetailPage() {
  return (
    <AuthGuard allow={[UserRole.CUSTOMER]}>
      <TicketDetail />
    </AuthGuard>
  );
}
