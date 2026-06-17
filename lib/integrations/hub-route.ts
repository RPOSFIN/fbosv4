/**
 * FBOS Integration Hub — data route (Phase 3).
 *
 * Google Sheet = Operations OS master hub.
 * ClickUp → Sales leads | Tally Cloud → Sheet finance tab → FBOS pull.
 * AI + Local LLM = Phase 5/6 (not in this phase).
 */

export type HubConnector = "tally" | "clickup" | "gsheet";

/** Sync order: push Tally to sheet, pull ClickUp leads, then pull full hub from GSheet */
export const HUB_SYNC_ORDER: HubConnector[] = ["tally", "clickup", "gsheet"];

export const INTEGRATION_HUB_ROUTE = {
  hub: "Google Sheet (Operations OS master)",
  description:
    "Operations OS is maintained from Google Sheet. ClickUp feeds Sales leads. Tally Cloud writes finance data to the sheet; FBOS pulls everything into the dashboard.",
  flows: [
    {
      id: "clickup-sales",
      from: "ClickUp",
      to: "Sales OS / Leads",
      via: "FBOS sync → leads table (dedupe + history)",
      module: "Sales",
    },
    {
      id: "tally-sheet",
      from: "Tally Cloud",
      to: "Google Sheet (Finance tab)",
      via: "XML gateway → GOOGLE_WEBAPP_URL write (when configured)",
      module: "Finance",
    },
    {
      id: "sheet-hub",
      from: "Google Sheet",
      to: "FBOS Dashboard",
      via: "Multi-tab CSV pull: Leads, Operations, Finance",
      module: "Operations + Dashboard",
    },
  ],
} as const;

export const PHASE_ROADMAP = {
  phase3: {
    label: "Integration Hub",
    status: "current",
    items: ["GSheet hub", "ClickUp", "Tally Cloud", "Sync All"],
  },
  phase4: {
    label: "Finance & Operations depth",
    status: "next",
    items: ["Job master", "Production", "P&L depth"],
  },
  phase5: {
    label: "AI Command Center",
    status: "final",
    items: ["AI recommendations", "Lead intelligence", "Executive insights"],
  },
  phase6: {
    label: "Local LLM",
    status: "final",
    items: ["Ollama / LM Studio", "Offline AI", "Private data"],
  },
} as const;

export function getHubSyncSteps(): string[] {
  return [
    "1. Tally Cloud → fetch vouchers → push to Google Sheet finance tab (if webapp configured)",
    "2. ClickUp → sync tasks → Sales leads (insert / update / skip + history)",
    "3. Google Sheet → pull all tabs → FBOS (leads, operations jobs, finance queue)",
    "4. Dashboard KPIs refresh from Supabase",
  ];
}
