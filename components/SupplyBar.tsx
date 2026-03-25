const TOTAL = 10_000_000_000;

interface Segment {
  label: string;
  value: number;
  color: string;
}

export default function SupplyBar({
  staked, locked, burned, circulating, secured, securedPct,
}: {
  staked: number;
  locked: number;
  burned: number;       // Moat-burned tokens
  circulating: number;
  secured: number;      // staked + locked + burned
  securedPct: string;
}) {
  const segments: Segment[] = [
    { label: 'Staked',      value: staked,      color: 'bg-blue-500'   },
    { label: 'Locked',      value: locked,      color: 'bg-violet-500' },
    { label: 'Burned',      value: burned,      color: 'bg-red-600'    },
    { label: 'Circulating', value: circulating, color: 'bg-zinc-600'   },
  ];

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 col-span-full hover:border-[#00FF41] transition-colors">

      {/* Secured summary — sits directly above the bar */}
      <p className="text-xs text-zinc-500 tracking-wider mb-2">
        <span className="text-[#00FF41] font-semibold text-sm">
          {Math.round(secured).toLocaleString('en-US')} $SUPERCYCLE
        </span>
        {' '}Secured in Moat
        <span className="ml-2 bg-black border border-[#00FF41]/30 text-[#00FF41] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {securedPct}% of 10B
        </span>
      </p>

      <p className="text-zinc-400 text-sm font-medium tracking-wider mb-3">Supply Distribution</p>

      {/* Stacked bar */}
      <div className="flex w-full h-4 rounded-full overflow-hidden gap-px">
        {segments.map((s) => (
          <div
            key={s.label}
            className={`${s.color} transition-all duration-500`}
            style={{ width: `${(s.value / TOTAL * 100).toFixed(4)}%` }}
            title={`${s.label}: ${s.value.toLocaleString('en-US')} $SUPERCYCLE`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span className={`inline-block w-2.5 h-2.5 rounded-sm ${s.color}`} />
            {s.label} — {(s.value / TOTAL * 100).toFixed(2)}%
          </div>
        ))}
      </div>
    </div>
  );
}
