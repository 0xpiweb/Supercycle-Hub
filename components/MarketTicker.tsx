'use client';

import { useState, useEffect, useCallback } from 'react';

const DEX_API      = 'https://api.dexscreener.com/latest/dex/pairs/avalanche/0x017c5608a8ab29ab23093726cf7c64e5ef88e191';
export const CHART_URL = 'https://dexscreener.com/avalanche/0x017c5608a8ab29ab23093726cf7c64e5ef88e191';
const REFRESH_MS   = 30_000;

export interface MarketData {
  priceUsd:  number | null;
  priceAvax: number | null;
  liquidity: number | null;
  fdv:       number | null;
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000_000) return '$' + (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000)     return '$' + (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)         return '$' + Math.round(n).toLocaleString('en-US');
  return '$' + n.toFixed(2);
}

function fmtPrice(n: number): string {
  if (n < 0.0001) return '$' + n.toFixed(8);
  if (n < 0.01)   return '$' + n.toFixed(6);
  return '$' + n.toFixed(4);
}

function fmtAvax(n: number): string {
  if (n < 0.000001) return n.toFixed(10) + ' WAVAX';
  if (n < 0.0001)   return n.toFixed(8)  + ' WAVAX';
  if (n < 0.01)     return n.toFixed(6)  + ' WAVAX';
  return n.toFixed(4) + ' WAVAX';
}

interface Props {
  initial: MarketData;
}

export default function MarketTicker({ initial }: Props) {
  const [market, setMarket] = useState<MarketData>(initial);

  const refresh = useCallback(async () => {
    try {
      const res  = await fetch(DEX_API, { cache: 'no-store' });
      const json = await res.json();
      const pair = json?.pairs?.[0] ?? null;
      if (!pair) return;
      setMarket({
        priceUsd:  pair.priceUsd    ? parseFloat(pair.priceUsd)    : null,
        priceAvax: pair.priceNative ? parseFloat(pair.priceNative) : null,
        liquidity: pair.liquidity?.usd ?? null,
        fdv:       pair.fdv ?? null,
      });
    } catch { /* keep stale data on error */ }
  }, []);

  useEffect(() => {
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const metrics: { label: string; value: string; live?: boolean }[] = [
    {
      label: 'Price USD',
      value: market.priceUsd  ? fmtPrice(market.priceUsd)  : '—',
      live:  true,
    },
    {
      label: 'Price WAVAX',
      value: market.priceAvax ? fmtAvax(market.priceAvax)  : '—',
    },
    {
      label: 'Liquidity',
      value: market.liquidity ? fmtUsd(market.liquidity)   : '—',
    },
    {
      label: 'Market Cap',
      value: market.fdv       ? fmtUsd(market.fdv)         : '—',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {metrics.map(({ label, value, live }) => (
        <div
          key={label}
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-1 hover:border-[#00FF41] transition-colors"
        >
          <span className="text-zinc-500 text-xs font-medium tracking-wider">{label}</span>
          <div className="flex items-center gap-1.5">
            {live && (
              <span className="relative flex h-2 w-2 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF41] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00FF41]" />
              </span>
            )}
            <span className="text-base font-bold tracking-wider text-white">
              {value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
