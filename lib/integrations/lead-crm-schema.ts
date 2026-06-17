/**
 * FBOS — Minimal ClickUp lead pipeline → 07_Lead_CRM
 * Matches "26-27 lead pipeline" list fields only.
 */

export const LEAD_CRM_TAB = "07_Lead_CRM";

/** ClickUp columns: Name, Status, mobile, Assignee, Priority, Next Follow-Up Date, Comments */
export const LEAD_CRM_HEADERS = [
  "Lead ID",
  "Client Name",
  "Contact No",
  "Lead Status",
  "Assigned To",
  "Priority",
  "Due Date",
  "Comments",
  "Start Date",
] as const;

/** Custom statuses on 26-27 lead pipeline (QUOATED = ClickUp spelling) */
export const CLICKUP_LEAD_STATUSES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "QUOATED",
  "NEGOTIATION",
  "LOST",
  "WON",
] as const;

export const LEAD_CRM_ENV_GID = "GOOGLE_SHEET_GID_LEADS";

/** ClickUp field → sheet column */
export const CLICKUP_TO_SHEET_MAP = {
  name: "Client Name",
  status: "Lead Status",
  mobile: "Contact No",
  assignee: "Assigned To",
  priority: "Priority",
  due_date: "Due Date",
  comments: "Comments",
  id: "Lead ID",
  date_created: "Start Date",
} as const;
