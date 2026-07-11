export type Observation = {
  id: string;
  module: string;
  text: string;
  depends_on: string[];
  created_at: string;
  status: "open" | "resolved";
};

export type SystemError = {
  id: string;
  module: string;
  message: string;
  depends_on: string[];
  severity: "low" | "medium" | "high";
  created_at: string;
  resolved: boolean;
};

const observations: Observation[] = [
  {
    id: "obs-1",
    module: "finance",
    text: "Receivable aging 90+ bucket high — prioritize collections call list",
    depends_on: ["finance_import_queue", "01_Dashboard"],
    created_at: new Date().toISOString(),
    status: "open",
  },
  {
    id: "obs-2",
    module: "operations",
    text: "Vendor mapping must be set before dispatch — see compliance checklist",
    depends_on: ["jobs", "OPS_VENDORS"],
    created_at: new Date().toISOString(),
    status: "open",
  },
];

const errors: SystemError[] = [
  {
    id: "err-1",
    module: "integrations",
    message: "Tally not connected — finance using Google Sheet fallback",
    depends_on: ["TALLY_IN_RECEIVABLES", "06_Finance_Sync"],
    severity: "medium",
    created_at: new Date().toISOString(),
    resolved: false,
  },
];

export function listObservations() {
  return [...observations];
}

export function listErrors() {
  return [...errors];
}

export function addObservation(input: Omit<Observation, "id" | "created_at" | "status">) {
  const row: Observation = {
    ...input,
    id: `obs-${Date.now()}`,
    created_at: new Date().toISOString(),
    status: "open",
  };
  observations.unshift(row);
  return row;
}

export function addError(input: Omit<SystemError, "id" | "created_at" | "resolved">) {
  const row: SystemError = {
    ...input,
    id: `err-${Date.now()}`,
    created_at: new Date().toISOString(),
    resolved: false,
  };
  errors.unshift(row);
  return row;
}
