export type EmployeeRouteSlot = {
  time: string;
  task: string;
};

export type EmployeeRoute = {
  employee: string;
  slots: EmployeeRouteSlot[];
  updated_at: string;
};

const routes = new Map<string, EmployeeRoute>();

const DEFAULT_ROUTES: EmployeeRoute[] = [
  {
    employee: "Rahul (Sales)",
    updated_at: new Date().toISOString(),
    slots: [
      { time: "09:00", task: "Follow-up calls — overdue receivables" },
      { time: "11:00", task: "Quotation review & WhatsApp dispatch" },
      { time: "14:00", task: "CRM update — GT_LEAD_CRM" },
      { time: "17:00", task: "Daily sales report" },
    ],
  },
  {
    employee: "Ops Team",
    updated_at: new Date().toISOString(),
    slots: [
      { time: "10:00", task: "Production board check" },
      { time: "13:00", task: "Dispatch pending orders" },
      { time: "16:00", task: "Vendor follow-up" },
    ],
  },
];

for (const r of DEFAULT_ROUTES) {
  routes.set(r.employee, r);
}

export function listRoutes(): EmployeeRoute[] {
  return [...routes.values()].sort((a, b) => a.employee.localeCompare(b.employee));
}

export function getRoute(employee: string): EmployeeRoute | null {
  return routes.get(employee) ?? null;
}

export function upsertRoute(
  employee: string,
  slots: EmployeeRouteSlot[]
): EmployeeRoute {
  const row: EmployeeRoute = {
    employee,
    slots,
    updated_at: new Date().toISOString(),
  };
  routes.set(employee, row);
  return row;
}

export function updateRouteSlot(
  employee: string,
  index: number,
  patch: Partial<EmployeeRouteSlot>
): EmployeeRoute | null {
  const current = routes.get(employee);
  if (!current || index < 0 || index >= current.slots.length) return null;
  current.slots[index] = { ...current.slots[index], ...patch };
  current.updated_at = new Date().toISOString();
  routes.set(employee, current);
  return current;
}
