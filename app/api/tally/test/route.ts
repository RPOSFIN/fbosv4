import { NextResponse } from 'next/server';
import { tallyClient } from '@/lib/integrations/tally-client';

export async function GET() {
  try {
    const config = tallyClient.getConfig();
    if (!config) {
      return NextResponse.json({
        ok: false,
        error: 'Tally not configured',
        missing: {
          TALLY_HOST: !process.env.TALLY_HOST,
          TALLY_PORT: !process.env.TALLY_PORT,
          TALLY_COMPANY_NAME: !process.env.TALLY_COMPANY_NAME,
        },
      });
    }

    const result = await tallyClient.testConnection();
    
    return NextResponse.json({
      ok: result.success,
      config: {
        host: config.host,
        port: config.port,
        company: config.companyName,
      },
      connection: {
        success: result.success,
        error: result.error,
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