import { NextRequest, NextResponse } from 'next/server';
import { fetchMoatEvents } from '@/lib/fetchMoatEvents';
import { fetchChainBalances } from '@/lib/fetchChainBalances';
import { supabase } from '@/lib/supabase';

const TOTAL_SUPPLY = 10_000_000_000;

export async function POST(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [moat, chain] = await Promise.all([
      fetchMoatEvents(),
      fetchChainBalances(),
    ]);

    const { staked, locked, burned } = moat;
    const { dead, lp } = chain;
    
    // dead already includes moat-burned tokens — no double-counting with burned
    const moatTotal   = staked + locked + dead;
    const circulating = TOTAL_SUPPLY - (moatTotal + lp);     

    const { error } = await supabase.from('lil_stats').insert({
      staked:      Math.round(staked),
      locked:      Math.round(locked),
      burned:      Math.round(burned),
      dead:        Math.round(dead),
      lp:          Math.round(lp),
      total_supply: TOTAL_SUPPLY,
      circulating: Math.round(circulating),
    });

    if (error) throw error;

    return NextResponse.json({ saved: true });
  } catch (err) {
    console.error('/api/snapshot error:', err);
    return NextResponse.json({ error: 'Snapshot failed' }, { status: 500 });
  }
}
