"use client";

import { BrowserQRCodeReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { UserRole } from "@eventful/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ApiErrorNotice } from "@/components/ui/api-error-notice";
import { StatusPill } from "@/components/ui/status-pill";
import { AuthGuard } from "@/lib/auth/auth-guard";
import { listPublishedEvents } from "@/lib/events/events-api";
import { GateValidationOutcome, validateTicket } from "@/lib/gate/gate-api";
import { presentGateResult } from "@/lib/gate/gate-result-presentation";

type EntryMode = "manual" | "camera";

function GateScreen() {
  const [eventId, setEventId] = useState("");
  const [mode, setMode] = useState<EntryMode>("manual");
  const [manualCode, setManualCode] = useState("");
  const [outcome, setOutcome] = useState<GateValidationOutcome | null>(null);

  const eventsQuery = useQuery({
    queryKey: ["gate-events"],
    queryFn: () => listPublishedEvents({ page: 1, pageSize: 50 }),
  });

  const validateMutation = useMutation({
    mutationFn: (payload: string) => validateTicket(eventId, payload),
    onSuccess: (result) => setOutcome(result),
  });

  function handleManualSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!eventId || !manualCode.trim()) {
      return;
    }
    validateMutation.mutate(manualCode.trim());
    setManualCode("");
  }

  function handleScan(payload: string) {
    if (!eventId) {
      return;
    }
    validateMutation.mutate(payload);
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-8 px-6 py-16">
      <div>
        <p className="font-ticket text-xs uppercase tracking-[0.2em] text-marquee">Door</p>
        <h1 className="font-display text-5xl font-bold uppercase leading-none text-paper">Gate check-in</h1>
      </div>

      <ApiErrorNotice error={eventsQuery.error} />

      <label className="flex flex-col gap-1.5 text-sm" htmlFor="gate-event">
        <span className="font-medium text-ink-400">Checking in for</span>
        <select
          id="gate-event"
          value={eventId}
          onChange={(changeEvent) => {
            setEventId(changeEvent.target.value);
            setOutcome(null);
          }}
          className="focus-ring rounded-lg border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-paper"
        >
          <option value="">Select an event…</option>
          {eventsQuery.data?.data.map((event) => (
            <option key={event.id} value={event.id}>
              {event.title}
            </option>
          ))}
        </select>
      </label>

      {eventId ? (
        <>
          <EntryModeTabs mode={mode} onChange={setMode} />

          {mode === "manual" ? (
            <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-sm" htmlFor="manual-code">
                <span className="font-medium text-ink-400">Ticket code</span>
                <textarea
                  id="manual-code"
                  rows={3}
                  value={manualCode}
                  onChange={(changeEvent) => setManualCode(changeEvent.target.value)}
                  placeholder="Paste or type the ticket's gate code"
                  className="focus-ring rounded-lg border border-ink-700 bg-ink-900 px-3.5 py-2.5 font-ticket text-sm text-paper"
                />
              </label>
              <Button type="submit" disabled={validateMutation.isPending} className="self-start">
                {validateMutation.isPending ? "Checking…" : "Check in"}
              </Button>
            </form>
          ) : (
            <CameraScanner active={mode === "camera"} onDecode={handleScan} />
          )}

          <ApiErrorNotice error={validateMutation.error} />

          {outcome ? <GateOutcomeCard outcome={outcome} /> : null}
        </>
      ) : null}
    </div>
  );
}

function EntryModeTabs({ mode, onChange }: { mode: EntryMode; onChange: (mode: EntryMode) => void }) {
  return (
    <div className="flex gap-2">
      <Button type="button" variant={mode === "manual" ? "primary" : "secondary"} onClick={() => onChange("manual")}>
        Manual entry
      </Button>
      <Button type="button" variant={mode === "camera" ? "primary" : "secondary"} onClick={() => onChange("camera")}>
        Scan with camera
      </Button>
    </div>
  );
}

function CameraScanner({ active, onDecode }: { active: boolean; onDecode: (payload: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [paused, setPaused] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (!active || paused || !videoRef.current) {
      return undefined;
    }

    const reader = new BrowserQRCodeReader();
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, error, controls) => {
        controlsRef.current = controls;
        if (cancelled || !result) {
          return;
        }
        controls.stop();
        setPaused(true);
        onDecode(result.getText());
      })
      .catch(() => setCameraError("Could not access the camera. Use manual entry instead."));

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [active, paused, onDecode]);

  if (cameraError) {
    return <p className="text-sm text-velvet">{cameraError}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <video ref={videoRef} className="aspect-square w-full rounded-xl border border-ink-700 object-cover" muted />
      {paused ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setPaused(false)}
          className="self-start"
        >
          Scan next ticket
        </Button>
      ) : null}
    </div>
  );
}

function GateOutcomeCard({ outcome }: { outcome: GateValidationOutcome }) {
  const presentation = presentGateResult(outcome.result);

  return (
    <div className="rounded-xl border border-ink-700 p-5">
      <StatusPill tone={presentation.tone} label={presentation.label} />
      <p className="mt-3 text-sm text-ink-300">{presentation.description}</p>
      {outcome.ticket ? (
        <dl className="mt-4 flex flex-col gap-1 font-ticket text-xs text-ink-500">
          <div className="flex justify-between">
            <dt>Ticket holder</dt>
            <dd className="text-paper">{outcome.ticket.customerName}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Event</dt>
            <dd className="text-paper">{outcome.ticket.eventTitle}</dd>
          </div>
          {outcome.ticket.seatLabel ? (
            <div className="flex justify-between">
              <dt>Seat</dt>
              <dd className="text-paper">{outcome.ticket.seatLabel}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

export default function GatePage() {
  return (
    <AuthGuard allow={[UserRole.GATE]}>
      <GateScreen />
    </AuthGuard>
  );
}
