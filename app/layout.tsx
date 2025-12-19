import type { Metadata } from "next";
import "./globals.css";

const APP_URL = "https://tx-hash-explainer.vercel.app/";
const BASE_APP_ID = "6945e035d77c069a945be1e2";

export const metadata: Metadata = {
  title: "Tx Hash Explainer",
  description: "Paste a tx hash → get a clean, receipt-style explanation (Base).",
  other: {
    "base:app_id": BASE_APP_ID,

    // Required for Base app embed rendering on the homeUrl page
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: `${APP_URL}/preview.png`,
      button: {
        title: "Open",
        action: { type: "launch_frame", url: APP_URL },
      },
    }),

    // Backward compatibility for some clients
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: `${APP_URL}/preview.png`,
      button: {
        title: "Open",
        action: { type: "launch_frame", url: APP_URL },
      },
    }),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
