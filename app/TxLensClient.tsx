"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { sdk } from "@farcaster/miniapp-sdk";

type TxData = {
  hash: string;
  chain: string;
  status: "success" | "reverted" | "pending" | string;
  from: string;
  to: string | null;
  valueEth: string;
  valueWei: string;
  gasLimit: string;
  gasUsed: string | null;
  gasPriceGwei: string | null;
  feeEth: string | null;
  blockNumber: string | null;
  timestamp: number | null;
};

function isTxHash(v: string) {
  return /^0x[a-fA-F0-9]{64}$/.test(v.trim());
}

function shortAddr(a: string, head = 6, tail = 4) {
  if (!a) return "—";
  if (a.length <= head + tail + 2) return a;
  return `${a.slice(0, head + 2)}…${a.slice(-tail)}`;
}

function fmtEth(n: string) {
  const v = Number(n);
  if (!Number.isFinite(v)) return n;
  if (v === 0) return "0";
  if (v >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: 6 });
  return v.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

async function copyText(text: string) {
  // Clipboard API first
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {}

  // Fallback: execCommand
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function TxLensClient() {
  const sp = useSearchParams();

  const [origin, setOrigin] = useState<string>("");
  const [hash, setHash] = useState<string>("");
  const [data, setData] = useState<TxData | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const lastFetchedRef = useRef<string>("");

  useEffect(() => { sdk.actions.ready(); }, []);
  useEffect(() => { try { setOrigin(window.location.origin); } catch {} }, []);

  // Prefill from URL (?hash=0x... or ?h=0x...)
  useEffect(() => {
    const v = (sp.get("hash") ?? sp.get("h") ?? "").trim();
    if (v && isTxHash(v)) {
      setHash(v);
      // auto run once
      if (lastFetchedRef.current !== v) run(v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const status = useMemo(() => {
    const s = (data?.status ?? "pending").toString();
    if (s === "success") return { label: "Success", cls: "badge good", dot: "dot good" };
    if (s === "reverted") return { label: "Reverted", cls: "badge bad", dot: "dot bad" };
    return { label: "Pending", cls: "badge warn", dot: "dot warn" };
  }, [data?.status]);

  const baseScanUrl = useMemo(() => {
    const h = (data?.hash ?? hash).trim();
    if (!isTxHash(h)) return null;
    return `https://basescan.org/tx/${h}`;
  }, [data?.hash, hash]);

  const shareUrl = useMemo(() => {
    if (!origin) return "";
    const h = (data?.hash ?? hash).trim();
    if (!isTxHash(h)) return origin;
    const u = new URL(origin);
    u.searchParams.set("hash", h);
    return u.toString();
  }, [origin, data?.hash, hash]);

  const narrative = useMemo(() => {
    if (!data) return "";
    const v = fmtEth(data.valueEth);
    const to = data.to ? shortAddr(data.to) : "contract creation";
    if (data.status === "reverted") {
      return `This transaction failed (reverted). You may still pay network fees. Value: ${v} ETH, to: ${to}.`;
    }
    if (data.status === "pending") {
      return `This transaction is still pending. If you just sent it, wait a bit and try again. Value: ${v} ETH, to: ${to}.`;
    }
    return `Success on Base: ${v} ETH sent to ${to}.`;
  }, [data]);

  async function run(forceHash?: string) {
    const h = (forceHash ?? hash).trim();
    setErr(null);
    setToast(null);

    if (!isTxHash(h)) {
      setErr("Paste a valid tx hash (0x + 64 hex).");
      setData(null);
      return;
    }

    setLoading(true);
    setData(null);

    try {
      const r = await fetch(`/api/tx?hash=${encodeURIComponent(h)}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error ?? "Failed to fetch tx");
      setData(j as TxData);
      lastFetchedRef.current = h;
    } catch (e: any) {
      setErr(e?.message ?? "Failed to fetch tx");
    } finally {
      setLoading(false);
    }
  }

  async function share() {
    await sdk.actions.composeCast({
      text: "I just used Tx Hash Explainer",
      embeds: ["https://tx-hash-explainer.vercel.app"],
    });
  }

  async function openExplorer() {
    if (!baseScanUrl) return;
    await sdk.actions.openUrl({ url: baseScanUrl });
  }

  async function addToApps() {
    await sdk.actions.addMiniApp();
  }

  async function copyReport() {
    if (!data) return;
    const lines = [
      "Tx Hash Explainer (Base)",
      `Hash: ${data.hash}`,
      `Status: ${data.status}`,
      `Value: ${data.valueEth} ETH`,
      `From: ${data.from}`,
      `To: ${data.to ?? "(contract creation)"}`,
      data.feeEth ? `Fee: ${data.feeEth} ETH` : "Fee: —",
      data.gasUsed ? `Gas used: ${data.gasUsed}/${data.gasLimit}` : `Gas limit: ${data.gasLimit}`,
      data.gasPriceGwei ? `Gas price: ${data.gasPriceGwei} gwei` : "Gas price: —",
      data.blockNumber ? `Block: ${data.blockNumber}` : "Block: —",
      data.timestamp ? `Time: ${new Date(data.timestamp * 1000).toISOString()}` : "Time: —",
      shareUrl ? `Link: ${shareUrl}` : null,
    ].filter(Boolean).join("\n");

    const ok = await copyText(lines);
    setToast(ok ? "Copied report ✅" : "Copy blocked — try selecting text.");
    setTimeout(() => setToast(null), 900);
  }

  async function copyField(v: string) {
    const ok = await copyText(v);
    setToast(ok ? "Copied ✅" : "Copy blocked");
    setTimeout(() => setToast(null), 700);
  }

  const canRun = useMemo(() => isTxHash(hash) && !loading, [hash, loading]);

  return (
    <div className="wrap">
      <div className="shell">
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
            <div>
              <h1 className="h1">Tx Hash Explainer</h1>
              <p className="p">
                Paste a Base tx hash and get a clean receipt-style breakdown.
              </p>
            </div>
</div>

          <div className="hr" />

          <div className="tag" style={{ justifyContent: "space-between", width: "100%" }}>
            <span className="mono">hash</span>
            <span className="mono" style={{ opacity: 0.7 }}>0x…64 hex</span>
          </div>

          <div style={{ marginTop: 10 }}>
            <input
              className="input mono"
              value={hash}
              onChange={(e) => {
                setHash(e.target.value);
                // keep UI responsive when user starts typing again
                setErr(null);
                setToast(null);
              }}
              placeholder="0x…"
            />
          </div>

          <div className="row">
            <button className="btn primary" onClick={() => run()} disabled={!canRun}>
              {loading ? "Analyzing…" : "Analyze"}
            </button>
            <button className="btn" onClick={() => { setHash(""); setData(null); setErr(null); setToast(null); }} disabled={loading}>
              Clear
            </button>
            <button className="btn" onClick={share} disabled={loading}>
              Share
            </button>
            <button className="btn" onClick={openExplorer} disabled={!baseScanUrl || loading}>
              Open explorer
            </button>
          </div>

          <div className="row">
            <button className="btn" onClick={copyReport} disabled={!data || loading}>
              Copy report
            </button>
            <button className="btn" onClick={addToApps}>
              Add to my apps
            </button>
          </div>

          {err && <div className="err">{err}</div>}
          {toast && <div className="toast">{toast}</div>}
        </div>

        <div className="receipt">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <div className={status.cls}>
              <span className={status.dot} />
              <span>{status.label}</span>
            </div>
            <div className="tag">
              <span className="mono">chain</span>
              <span className="mono" style={{ opacity: 0.7 }}>base</span>
            </div>
          </div>

          <div className="big">{data ? `${fmtEth(data.valueEth)} ETH` : "—"}</div>
          <div className="small">{data ? narrative : "Run an analysis to see details."}</div>

          <div className="hr" />

          <div className="grid2">
            <div>
              <div className="kv">
                <div className="k">From</div>
                <div className="v mono">
                  {data ? data.from : "—"}
                  {data ? (
                    <button className="btn" style={{ marginLeft: 10 }} onClick={() => copyField(data.from)}>Copy</button>
                  ) : null}
                </div>
              </div>
              <div className="kv">
                <div className="k">To</div>
                <div className="v mono">
                  {data ? (data.to ?? "(contract creation)") : "—"}
                  {data?.to ? (
                    <button className="btn" style={{ marginLeft: 10 }} onClick={() => copyField(data.to!)}>Copy</button>
                  ) : null}
                </div>
              </div>
              <div className="kv">
                <div className="k">Hash</div>
                <div className="v mono">
                  {data ? data.hash : "—"}
                  {data ? (
                    <button className="btn" style={{ marginLeft: 10 }} onClick={() => copyField(data.hash)}>Copy</button>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <div className="kv">
                <div className="k">Fee</div>
                <div className="v mono">{data?.feeEth ? `${fmtEth(data.feeEth)} ETH` : "—"}</div>
              </div>
              <div className="kv">
                <div className="k">Gas</div>
                <div className="v mono">
                  {data?.gasUsed ? `${data.gasUsed}/${data.gasLimit}` : data?.gasLimit ?? "—"}
                </div>
              </div>
              <div className="kv">
                <div className="k">Gas price</div>
                <div className="v mono">{data?.gasPriceGwei ? `${data.gasPriceGwei} gwei` : "—"}</div>
              </div>
              <div className="kv">
                <div className="k">Block</div>
                <div className="v mono">{data?.blockNumber ?? "—"}</div>
              </div>
              <div className="kv">
                <div className="k">Time</div>
                <div className="v mono">
                  {data?.timestamp ? new Date(data.timestamp * 1000).toLocaleString() : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="hr" />

          <div className="small">
            Quick sanity checks: <span className="mono">reverted</span> means the call failed; <span className="mono">pending</span> means it may not be indexed yet.
          </div>
        </div>
      </div>
    </div>
  );
}
