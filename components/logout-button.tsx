"use client";

import { signOut } from "@/lib/api/client";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm px-3 py-1 rounded border border-slate-700 hover:border-red-400 text-slate-300"
    >
      Logout
    </button>
  );
}
