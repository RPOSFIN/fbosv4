import { NextResponse } from "next/server";
import { tallyAdapter } from "@/lib/integrations/tally-adapter";
import { tallyClient } from "@/lib/integrations/tally-client";

export async function GET() {
  try {
    const status = await tallyAdapter.getStatus();

    let liveTest = null;
    const config = await tallyClient.getResolvedConfig();
    if (config) {
      const result = await tallyClient.testConnection(config);
      liveTest = {
        success: result.success,
        error: result.error,
        endpoint: result.endpoint,
        durationMs: result.durationMs,
        status: result.status,
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
