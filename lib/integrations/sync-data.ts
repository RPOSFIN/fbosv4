export interface ClickUpTaskRow {
  id: string;
  external_id: string;
  name: string;
  status: string | null;
  list_name: string | null;
  space_name: string | null;
  synced_at: string | null;
}

export type IntegrationSyncData = {
  // Existing fields
  tasks?: ClickUpTaskRow[];
  clickupTasks?: ClickUpTaskRow[];
  clickupTaskCount?: number;
  lastSyncAt?: string;

  // NEW: Table availability status
  tables?: {
    clickup_tasks?: boolean;
    finance_import_queue?: boolean;
    sheet_sync_log?: boolean;
    lead_history?: boolean;
    [key: string]: boolean | undefined;
  };

  // NEW: Source tracking per connector
  source?: {
    clickup?: string;
    tally?: string;
    gsheet?: string;
    apps_script?: string;
    [key: string]: string | undefined;
  };

  // NEW: Additional metadata
  syncStatus?: string;
  lastError?: string;
  [key: string]: unknown;
};