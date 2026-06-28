"use client";

import EngineeringPanel from "@/components/engineering/engineering-panel";

/**
 * EngineeringOS is a developer tool, surfaced primarily as a collapsible panel
 * inside the Integrations page (no permanent sidebar module). This standalone
 * route renders the same panel expanded for direct/deep-link access.
 */
export default function EngineeringCenterPage() {
  return (
    <div className="p-8 max-w-5xl">
      <h1 className="text-2xl font-black text-slate-900 mb-4">EngineeringOS</h1>
      <EngineeringPanel defaultExpanded />
    </div>
  );
}
