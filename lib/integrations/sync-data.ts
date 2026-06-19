export type ClickUpTaskRow = {
  id: string;
  external_id?: string;
  name: string;
  status?: string | null;
  list_name?: string | null;
  space_name?: string | null;
  synced_at?: string;
};

export type IntegrationSyncData = {
  tasks?: ClickUpTaskRow[];
  clickupTasks?: ClickUpTaskRow[];
  clickupTaskCount?: number;
  lastSyncAt?: string;
};