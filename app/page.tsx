import { fetchMoatEvents } from '@/lib/fetchMoatEvents';
import { fetchChainBalances } from '@/lib/fetchChainBalances';
import { supabase, LilStatsRow } from '@/lib/supabase';
import type { Stats, Delta } from '@/lib/types';
import { Scale } from 'lucide-react';
import StatCard from '@/components/StatCard';
import SupplyBar from '@/components/SupplyBar';
import MarketTicker, { CHART_URL, type MarketData } from '@/components/MarketTicker';

// Supply constants
const TOTAL_SUPPLY     = 10_000_000_000;
const HISTORICAL_BURNS = 0;
const MOAT_ADDR_PUB = process.env.NEXT_PUBLIC_MOAT_ADDRESS ?? '0x464b2817f16f6117602ad05bae446c2fc5ba6fb7';
const TOKEN_ADDR    = '0xCA2e0f72653337d05B1ABceBEA5718A4A3E57a0b';
const MOAT_URL  = `https://moats.app/moat/${MOAT_ADDR_PUB}`;
const BURN_URL  = `https://snowtrace.io/token/${TOKEN_ADDR}?a=0x000000000000000000000000000000000000dead`;
const BUY_URL   = `https://pharaoh.exchange/swap?outputCurrency=${TOKEN_ADDR}&to=${TOKEN_ADDR}`;
const LP_URL    = 'https://pharaoh.exchange/liquidity/v2/0x017c5608a8ab29ab23093726cf7c64e5ef88e191';
const DEX_API   = 'https://api.dexscreener.com/latest/dex/pairs/avalanche/0x017c5608a8ab29ab23093726cf7c64e5ef88e191';

// All percentages relative to true 10B total supply
function pct(value: number): string {
  return (value / TOTAL_SUPPLY * 100).toFixed(2);
}

function rowToStats(row: LilStatsRow): Stats {
  const { staked, locked, dead, lp } = row;
  const secured      = staked + locked + row.burned;
  const moatTotal    = staked + locked + dead + HISTORICAL_BURNS;
  const totalRemoved = moatTotal + lp;
  const circulating  = TOTAL_SUPPLY - totalRemoved;
  return {
    staked,     stakedPct:      pct(staked),
    locked,     lockedPct:      pct(locked),
    burned:     row.burned,     burnedPct:      pct(row.burned),
    dead,       deadPct:        pct(dead),
    lp,         lpPct:          pct(lp),
    totalRemoved, totalRemovedPct: pct(totalRemoved),
    circulating,  circulatingPct:  pct(circulating),
    moatTotal,
    moatStrength:  pct(moatTotal),
    tokensToGoal:  0,
    secured,
    securedPct:    pct(secured),
  };
}

function calcDelta(latest: LilStatsRow, previous: LilStatsRow | null): Delta {
  if (!previous) {
    return { staked: null, locked: null, burned: null, dead: null, lp: null, circulating: null };
  }
  return {
    staked:      latest.staked      - previous.staked,
    locked:      latest.locked      - previous.locked,
    burned:      latest.burned      - previous.burned,
    dead:        latest.dead        - previous.dead,
    lp:          latest.lp          - previous.lp,
    circulating: latest.circulating - previous.circulating,
  };
}

export const revalidate = 60;

export default async function Dashboard() {
  const [moat, chain, supabaseRes, dexRes] = await Promise.all([
    fetchMoatEvents(),
    fetchChainBalances(),
    supabase.from('lil_stats').select('*').order('created_at', { ascending: false }).limit(1),
    fetch(DEX_API, { next: { revalidate: 60 } }),
  ]);

  const rows = supabaseRes.data;

  const latest: any = {
    staked: moat?.staked || 0,
    locked: moat?.locked || 0,
    burned: moat?.burned || 0,
    dead: chain?.dead || 0,
    lp: chain?.lp || 0,
    created_at: new Date().toISOString()
  };
  const latestMoat = latest.staked + latest.locked + latest.dead + HISTORICAL_BURNS;
  latest.circulating = TOTAL_SUPPLY - (latestMoat + latest.lp);

  const stats    = rowToStats(latest);
  const previous = rows && rows[0] ? rows[0] : latest;
  const delta    = calcDelta(latest, previous);
  const circulatingDeltaInvalid =
    delta.circulating == null ||
    previous.circulating <= 0 ||
    Math.abs(delta.circulating) > TOTAL_SUPPLY;

  // Market data — server-side initial value for the client MarketTicker
  const dexJson = await dexRes.json().catch(() => null);
  const pair    = dexJson?.pairs?.[0] ?? null;
  const initialMarket: MarketData = {
    priceUsd:  pair?.priceUsd    ? parseFloat(pair.priceUsd)    : null,
    priceAvax: pair?.priceNative ? parseFloat(pair.priceNative) : null,
    liquidity: pair?.liquidity?.usd ?? null,
    fdv:       pair?.fdv ?? null,
  };

  const updatedAt = new Date().toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });

  const btnBase = 'inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-colors';

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-wider flex items-center gap-3">
            <div className="h-10 w-10 min-w-[40px] rounded-full border-2 border-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.4)] overflow-hidden flex-shrink-0">
              <img src="/super.png" className="h-full w-full object-cover" alt="Supercycle" />
            </div>
            $SUPERCYCLE Hub
          </h1>
          <p className="text-zinc-400 mt-1 text-sm flex items-center gap-2 flex-wrap">
            <span>Total Supply: <span className="text-[#00FF41] font-medium [text-shadow:0_0_12px_rgba(0,255,65,0.5)]">10,000,000,000 $SUPERCYCLE</span></span>
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF41] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF41]"></span>
              </span>
              <span className="text-zinc-500 uppercase text-[10px] tracking-widest font-bold">Live Network</span>
            </span>
          </p>
        </div>

        {/* Market Metrics — client component, auto-refreshes every 30s */}
        <MarketTicker initial={initialMarket} />

        {/* Row 1: Moat activity */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <StatCard icon="🏛️" label="Staked"  value={stats.staked}  pct={stats.stakedPct}  delta={delta.staked}  provenance="🏰" />
          <StatCard icon="🔐" label="Locked"  value={stats.locked}  pct={stats.lockedPct}  delta={delta.locked}  provenance="🏰" />
          <StatCard icon="🔥" label="Burned"  value={stats.burned}  pct={stats.burnedPct}  delta={delta.burned}  provenance="🏰" />
        </div>

        {/* Row 2: Supply breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <StatCard icon="💀" label="Total Burned"  value={stats.dead}        pct={stats.deadPct}        delta={delta.dead}        provenanceSrc="/skull.svg"      provenanceSrcAlt="Skull" />
          <StatCard icon="⚖️" label="LP Pair"       value={stats.lp}          pct={stats.lpPct}          delta={delta.lp}          iconNode={<Scale className="h-4 w-4 text-zinc-400" />} provenanceSrc="/logo-arena.svg" provenanceSrcAlt="Arena" />
          <StatCard icon="💎" label="Circulating"   value={stats.circulating} pct={stats.circulatingPct} delta={delta.circulating}       iconSrc="/super-favicon.png"     provenanceSrc="/globe.svg"      provenanceSrcAlt="Globe" hideChange={circulatingDeltaInvalid} />
        </div>

        <SupplyBar
          staked={stats.staked}
          locked={stats.locked}
          burned={stats.burned}
          circulating={stats.circulating}
          secured={stats.secured}
          securedPct={stats.securedPct}
        />

        {/* Action Bar */}
        <div className="flex flex-wrap justify-center gap-2 py-6">
          <a href={BUY_URL} target="_blank" rel="noopener noreferrer"
            className={`${btnBase} bg-emerald-950 border-emerald-700 text-emerald-300 hover:bg-emerald-900`}>
            🛒 Buy $SUPERCYCLE
          </a>
          <a href={MOAT_URL} target="_blank" rel="noopener noreferrer"
            className={`${btnBase} bg-blue-950 border-blue-700 text-blue-300 hover:bg-blue-900`}>
            🏰 Stake
          </a>
          <a href={MOAT_URL} target="_blank" rel="noopener noreferrer"
            className={`${btnBase} bg-violet-950 border-violet-700 text-violet-300 hover:bg-violet-900`}>
            🔐 Lock
          </a>
          <a href={MOAT_URL} target="_blank" rel="noopener noreferrer"
            className={`${btnBase} bg-zinc-900/50 border-zinc-700 text-zinc-300 hover:border-[#00FF41] hover:text-[#00FF41]`}>
            🔥 Burn
          </a>
          <a href={BURN_URL} target="_blank" rel="noopener noreferrer"
            className={`${btnBase} bg-red-950 border-red-800 text-red-300 hover:bg-red-900`}>
            💀 View Total Burn
          </a>
          <a href={CHART_URL} target="_blank" rel="noopener noreferrer"
            className={`${btnBase} bg-zinc-900/50 border-[#00FF41]/40 text-[#00FF41] hover:border-[#00FF41] hover:bg-[#00FF41]/10`}>
            📈 Live Chart
          </a>
        </div>

        {/* System Legend */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 mt-4">
          <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mb-3">System Legend</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">🏛️</span>
              <p className="text-xs text-zinc-500"><span className="text-zinc-300 font-medium">Staked</span> — $SUPERCYCLE actively staked in The Moat.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">🔐</span>
              <p className="text-xs text-zinc-500"><span className="text-zinc-300 font-medium">Locked</span> — $SUPERCYCLE time-locked in The Moat.</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-base leading-none mt-0.5">🔥</span>
              <p className="text-xs text-zinc-500"><span className="text-zinc-300 font-medium">Burned</span> — $SUPERCYCLE burned via The Moat contract.</p>
            </div>
            <div className="flex items-start gap-2">
              <img src="/skull.svg" className="h-4 w-4 mt-0.5 flex-shrink-0" alt="Skull" />
              <p className="text-xs text-zinc-500"><span className="text-zinc-300 font-medium">Total Burned</span> — All $SUPERCYCLE sent to the dead address.</p>
            </div>
            <div className="flex items-start gap-2">
              <img src="/pharaoh.svg" className="h-4 w-4 mt-0.5 flex-shrink-0" alt="Scales" />
              <p className="text-xs text-zinc-500"><span className="text-zinc-300 font-medium">LP Pair</span> — $SUPERCYCLE liquidity locked in The Arena.</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="h-4 w-4 mt-0.5 flex-shrink-0 rounded-full overflow-hidden border border-[#00FF41]/30">
                <img src="/super-favicon.png" className="h-full w-full object-cover" alt="Supercycle" />
              </div>
              <p className="text-xs text-zinc-500"><span className="text-zinc-300 font-medium">Circulating</span> — 10B minus all secured supply.</p>
            </div>
          </div>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-8">
          Last live check: {updatedAt}
        </p>
      </div>
    </main>
  );
}
