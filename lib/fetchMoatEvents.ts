import axios from 'axios';

const RPC_URL   = (process.env.AVAX_RPC_URL ?? 'https://api.avax.network/ext/bc/C/rpc').trim();
const MOAT_ADDR = (process.env.NEXT_PUBLIC_MOAT_ADDRESS ?? '0x464b2817f16f6117602ad05bae446c2fc5ba6fb7').trim();

// keccak256("getTotalAmounts()") = 0xc4a7761e
// Returns (uint256 totalStaked, uint256 totalLocked, uint256 totalBurned, uint256 totalInContract)
const SELECTOR = '0xc4a7761e';

function fromWei(wei: bigint): number {
  // Divide by 10^16 then by 100 — preserves 2 decimal places without float precision loss
  return Number(wei / 10n ** 16n) / 100;
}

export async function fetchMoatEvents() {
  try {
    const { data } = await axios.post(
      RPC_URL,
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: MOAT_ADDR, data: SELECTOR }, 'latest'],
      },
      { timeout: 10000 }
    );

    if (!data?.result || data.result === '0x') {
      return { staked: 0, locked: 0, burned: 0 };
    }

    // ABI-decode 4 × uint256 (each 32 bytes = 64 hex chars), strip leading 0x
    const hex    = data.result.slice(2);
    const staked = fromWei(BigInt('0x' + hex.slice(0,   64)));
    const locked = fromWei(BigInt('0x' + hex.slice(64,  128)));
    const burned = fromWei(BigInt('0x' + hex.slice(128, 192)));

    console.log('[Moat] staked:', staked, '| locked:', locked, '| burned:', burned);
    return { staked, locked, burned };
  } catch (err) {
    console.error('[Moat] fetchMoatEvents error:', err);
    return { staked: 0, locked: 0, burned: 0 };
  }
}
