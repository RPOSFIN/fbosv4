import { NextResponse } from "next/server";
import { tallyClient } from "@/lib/integrations/tally-client";
import { getResolvedTallyConfig } from "@/lib/integrations/tally-config";

function previewPayload(data: unknown): string | null {
  if (typeof data !== "string") return null;
  return data.replace(/\s+/g, " ").trim().slice(0, 500);
}

export async function GET() {
  try {
    const resolved = await getResolvedTallyConfig();
    const config = await tallyClient.getResolvedConfig();

    if (!config) {
      return NextResponse.json({
        ok: false,
        mode: "unconfigured",
        error: "Tally host is not configured",
        config: {
          host: null,
          port: Number(resolved.port),
          company: resolved.company || null,
          source: resolved.hostSource,
        },
        missing: {
          TALLY_HOST: !process.env.TALLY_HOST && !process.env.TALLY_SERVER_URL,
          TALLY_PORT: !process.env.TALLY_PORT,
          TALLY_COMPANY_NAME: !process.env.TALLY_COMPANY_NAME,
        },
        timestamp: new Date().toISOString(),
      });
    }

    const result = await tallyClient.testConnection(config);

    return NextResponse.json({
      ok: result.success,
      mode: result.success ? "active" : "bypass",
      config: {
        host: config.host,
        port: config.port,
        company: config.companyName,
        source: resolved.hostSource,
      },
      connection: {
        success: result.success,
        error: result.error,
        endpoint: result.endpoint,
        durationMs: result.durationMs,
        status: result.status,
        dataPreview: previewPayload(result.data),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}
