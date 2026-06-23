import { NextResponse } from 'next/server';
import { tallyAdapter } from '@/lib/integrations/tally-adapter';

export async function POST() {
  try {
    const status = await tallyAdapter.getStatus();
    
    if (status.mode !== 'active') {
      return NextResponse.json({
        ok: false,
        error: `Tally not available. Current mode: ${status.mode}`,
        status,
      });
    }

    const result = await tallyAdapter.syncPending();
    
    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 }
    );
  }
}