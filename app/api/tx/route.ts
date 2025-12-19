import { NextResponse } from "next/server";
import { createPublicClient, http, formatEther, formatUnits } from "viem";
import { base } from "viem/chains";

const RPC_URL = "https://mainnet.base.org";
const client = createPublicClient({ chain: base, transport: http(RPC_URL) });

function isTxHash(v: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(v);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const hash = (searchParams.get("hash") ?? "").trim();

  if (!isTxHash(hash)) {
    return NextResponse.json({ error: "Invalid transaction hash" }, { status: 400 });
  }

  try {
    const tx = await client.getTransaction({ hash: hash as `0x${string}` });

    // Receipt can be missing if tx is pending / not indexed yet
    let receipt: any = null;
    try {
      receipt = await client.getTransactionReceipt({ hash: hash as `0x${string}` });
    } catch {}

    const status = receipt?.status ?? "pending";
    const gasUsed: bigint | null = receipt?.gasUsed ?? null;
    const effectiveGasPrice: bigint | null = receipt?.effectiveGasPrice ?? tx.gasPrice ?? null;

    const feeWei =
      gasUsed !== null && effectiveGasPrice !== null ? gasUsed * effectiveGasPrice : null;

    const blockNumber: bigint | null = receipt?.blockNumber ?? tx.blockNumber ?? null;

    let timestamp: number | null = null;
    if (blockNumber !== null) {
      try {
        const block = await client.getBlock({ blockNumber });
        timestamp = typeof block.timestamp === "bigint" ? Number(block.timestamp) : null;
      } catch {}
    }

    return NextResponse.json({
      hash,
      chain: "base",
      status,
      from: tx.from,
      to: tx.to ?? null,
      valueEth: formatEther(tx.value),
      valueWei: tx.value.toString(),
      gasLimit: tx.gas.toString(),
      gasUsed: gasUsed?.toString() ?? null,
      gasPriceGwei: effectiveGasPrice ? formatUnits(effectiveGasPrice, 9) : null,
      feeEth: feeWei ? formatEther(feeWei) : null,
      blockNumber: blockNumber?.toString() ?? null,
      timestamp,
    });
  } catch (e: any) {
    const msg = (e?.message ?? "").toLowerCase();
    if (msg.includes("not found") || msg.includes("transaction") && msg.includes("not")) {
      return NextResponse.json({ error: "Transaction not found yet" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 });
  }
}
