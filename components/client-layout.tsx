"use client";

import Sidebar from "@/components/sidebar";
import FlexiflairSplash from "@/components/command-center/flexiflair-splash";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <FlexiflairSplash />
      <Sidebar role="super_admin" />
      <main className="flex-1 min-w-0 text-slate-900">{children}</main>
    </div>
  );
}
