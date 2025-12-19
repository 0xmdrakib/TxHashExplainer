# Mini App #3 — Tx Hash Explainer (Lite)

Idea: tx hash → “from/to/value/fee” human summary (Base).  

## Run
```bash
npm install
npm run dev
```

## Base Build patch (only 2 files)
1) `app/layout.tsx`
   - Set `APP_URL` to your deployed URL
   - Set `BASE_APP_ID` from the Base Build verify modal

2) `public/.well-known/farcaster.json`
   - Paste `accountAssociation.header/payload/signature` from Base Build
   - Replace `https://your-app-url.com` with your real deployed URL
