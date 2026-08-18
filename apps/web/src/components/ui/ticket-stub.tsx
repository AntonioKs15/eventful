import { ReactNode } from "react";

interface TicketStubProps {
  children: ReactNode;
  stub: ReactNode;
  className?: string;
}

export function TicketStub({ children, stub, className = "" }: TicketStubProps) {
  return (
    <div className={`ticket-stub overflow-hidden rounded-2xl shadow-lg shadow-black/40 ${className}`}>
      <div className="p-5">{children}</div>
      <div className="ticket-perforation flex items-center justify-between px-5 py-3">{stub}</div>
    </div>
  );
}
