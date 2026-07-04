import { NextResponse } from "next/server";
import { tallyAdapter } from "@/lib/integrations/tally-adapter";
import { tallyClient } from "@/lib/integrations/tally-client";

export async function GET() {
  try {
    const status = await tallyAdapter.getStatus();

    let liveTest = null;
    if (status.mode === "active") {
      const config = await tallyClient.getResolvedConfig();
      const result = config
        ? await tallyClient.testConnection(config)
        : { success: false, error: "Tally not configured" };
      liveTest = {
        success: result.success,
        error: result.error,
      };
    }

    return NextResponse.json({
      ok: status.mode === "active",
      status,
      liveTest,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
