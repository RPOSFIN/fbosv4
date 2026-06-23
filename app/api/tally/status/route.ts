import { NextResponse } from 'next/server';
import { tallyAdapter } from '@/lib/integrations/tally-adapter';
import { tallyClient } from '@/lib/integrations/tally-client';

export async function GET() {
  try {
    const status = await tallyAdapter.getStatus();
    
    // If active, also test connection live
    let liveTest = null;
    if (status.mode === 'active') {
      const result = await tallyClient.testConnection();
      liveTest = {
        success: result.success,
        error: result.error,
      };
    }

    return NextResponse.json({
      ok: true,
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