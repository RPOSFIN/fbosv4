import { NextResponse } from "next/server";
import { apiSuccess, authorize } from "@/lib/rbac/api-auth";
import { getLeadStats } from "@/lib/leads/stats";

export async function GET() {
  console.log(
    "SERVICE_ROLE_KEY loaded:",
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
  console.log(
    "SUPABASE_URL loaded:",
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  );

  try {
    const auth = await authorize("leads", "read");
    if ("error" in auth) return auth.error;

    const stats = await getLeadStats();
    return apiSuccess(stats);
  } catch (error: any) {
    console.error("LEADS STATS ERROR:", {
      message: error?.message,
      stack: error?.stack,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
    });

    if (
      error?.message?.includes("SUPABASE_SERVICE_ROLE_KEY") ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      console.log(
        "SUPA env keys:",
        Object.keys(process.env).filter((k) => k.includes("SUPA"))
      );
    }

    return NextResponse.json(
      {
        error: error?.message ?? "unknown",
        stack: error?.stack ?? null,
        code: error?.code ?? null,
        hint: error?.hint ?? null,
      },
      { status: 500 }
    );
  }
}
