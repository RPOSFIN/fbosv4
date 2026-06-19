export type ClickUpTaskRow = {
  id: string;
  name: string;
  status?: string;
};

export type IntegrationSyncData = {
  tasks?: ClickUpTaskRow[];
  lastSyncAt?: string;
};
