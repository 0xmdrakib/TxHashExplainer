import type { Metadata } from "next";
import "./globals.css";
import ClientReady from "./ClientReady";

const APP_URL = "https://tx-hash-explainer.vercel.app";
const BASE_APP_ID = "6945e035d77c069a945be1e2";

const MINIAPP_EMBED = {
  version: "1",
  imageUrl: `${APP_URL}/preview.png`,
  button: {
    title: "Open Tx Hash Explainer",
    action: {
      type: "launch_miniapp",
      name: "Tx Hash Explainer",
      url: APP_URL,
      splashImageUrl: `${APP_URL}/splash.png`,
      splashBackgroundColor: "#0b0d12"
    }
  }
};

const FRAME_EMBED = {
  ...MINIAPP_EMBED,
  button: {
    ...MINIAPP_EMBED.button,
    action: {
      ...MINIAPP_EMBED.button.action,
      type: "launch_frame"
    }
  }
};

export const metadata: Metadata = {
  title: "Tx Hash Explainer",
  description: "Paste a tx hash → get a clean, receipt-style explanation (Base).",
  other: {
    "base:app_id": BASE_APP_ID,
    "fc:miniapp": JSON.stringify(MINIAPP_EMBED),
    "fc:frame": JSON.stringify(FRAME_EMBED)
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClientReady />
        {children}
      </body>
    </html>
  );
}
