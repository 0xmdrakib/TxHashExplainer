import { Suspense } from "react";
import TxLensClient from "./TxLensClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="wrap">
          <div className="panel" style={{ maxWidth: 720, width: "100%" }}>
            <h1 className="h1">Tx Hash Explainer</h1>
            <p className="p">Loading…</p>
          </div>
        </div>
      }
    >
      <TxLensClient />
    </Suspense>
  );
}
