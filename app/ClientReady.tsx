"use client";

import { useEffect } from "react";
import sdk from "@farcaster/frame-sdk";

/**
 * Ensures Farcaster/Warpcast mini app webviews don't hang on launch.
 * Safe in Base App too.
 */
export default function ClientReady() {
  useEffect(() => {
    sdk.actions.ready().catch(() => {});
  }, []);

  return null;
}
