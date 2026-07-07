import type { KernelModuleDefinition } from "@/core/kernel/kernel-manager";

export const modulesRegistry: KernelModuleDefinition[] = [
  {
    id: "ceo-command-center",
    label: "CEO Command Center",
    route: "/ceo-command-center",
    layer: "business",
    owner: "executive",
    status: "registered",
    dependencies: [],
  },
  {
    id: "finance-os",
    label: "FinanceOS",
    route: "/finance",
    layer: "business",
    owner: "finance",
    status: "registered",
    dependencies: [],
  },
  {
    id: "sales-os",
    label: "SalesOS",
    route: "/sales",
    layer: "business",
    owner: "sales",
    status: "registered",
    dependencies: [],
  },
  {
    id: "operations-os",
    label: "OperationsOS",
    route: "/operations",
    layer: "business",
    owner: "operations",
    status: "registered",
    dependencies: [],
  },
  {
    id: "integration-hub",
    label: "Integration Hub",
    route: "/integrations",
    layer: "platform",
    owner: "platform",
    status: "registered",
    dependencies: [],
  },
];
