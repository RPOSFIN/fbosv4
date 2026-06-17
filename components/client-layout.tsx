"use client";

import Sidebar from "@/components/sidebar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex">
      <Sidebar role="super_admin" />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
