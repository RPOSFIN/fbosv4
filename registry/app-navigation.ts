export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  moduleId: string;
  parentId?: string;
  order: number;
  visible: boolean;
};

export const appNavigation: NavigationItem[] = [
  { id: "home", label: "Home", href: "/", moduleId: "home", order: 0, visible: true },
  { id: "ceo-command-center", label: "CEO Command Center", href: "/ceo-command-center", moduleId: "ceo-command-center", order: 10, visible: true },
  { id: "finance-os", label: "FinanceOS", href: "/finance", moduleId: "finance-os", order: 20, visible: true },
  { id: "finance-dashboard", label: "Dashboard", href: "/finance/dashboard", moduleId: "finance-os", parentId: "finance-os", order: 21, visible: true },
  { id: "finance-gst", label: "GST Calculator", href: "/finance/gst", moduleId: "finance-os", parentId: "finance-os", order: 22, visible: true },
  { id: "finance-emi", label: "EMI Calculator", href: "/finance/emi", moduleId: "finance-os", parentId: "finance-os", order: 23, visible: true },
  { id: "finance-expenses", label: "Expense Calculator", href: "/finance/expenses", moduleId: "finance-os", parentId: "finance-os", order: 24, visible: true }
];
