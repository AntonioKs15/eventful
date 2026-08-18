import { GateValidationResult } from "@eventful/contracts";
import { StatusTone } from "@/components/ui/status-pill";

export interface GateResultPresentation {
  tone: StatusTone;
  label: string;
  description: string;
}

const GATE_RESULT_PRESENTATION: Record<GateValidationResult, GateResultPresentation> = {
  [GateValidationResult.VALID]: {
    tone: "positive",
    label: "Valid",
    description: "Ticket accepted. Let them in.",
  },
  [GateValidationResult.ALREADY_USED]: {
    tone: "warning",
    label: "Already used",
    description: "This ticket was already scanned at this gate.",
  },
  [GateValidationResult.WRONG_EVENT]: {
    tone: "warning",
    label: "Wrong event",
    description: "This ticket is for a different event.",
  },
  [GateValidationResult.NOT_FOUND]: {
    tone: "negative",
    label: "Invalid code",
    description: "This code does not match a real ticket.",
  },
};

export function presentGateResult(result: GateValidationResult): GateResultPresentation {
  return GATE_RESULT_PRESENTATION[result];
}
