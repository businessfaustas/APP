# AuctionPulse AI — Chrome extension (MV3)

Adds an **Analyze with AuctionPulse** button to lot pages on Copart, IAAI and Bid.cars. It
sends what you can see on the page — the page text, structured data (JSON-LD), the page
HTML and the vehicle photo URLs — to your AuctionPulse account, then opens the report in a new tab.

Using the extension helps with:

- lots whose details only show when you're signed in to the auction
- sites that block server-side fetching

## Build and install

```bash
# from the repo root
EXTENSION_APP_URL=https://your-app.example.com pnpm extension:build   # defaults to NEXT_PUBLIC_APP_URL or http://localhost:3000
```

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and choose `extension/dist`.
3. The options page opens. In AuctionPulse, go to **Settings → Browser extension → Create token**, paste the token into the options page, then click **Test connection**.

The token is stored only in this browser (`chrome.storage.local`). You can revoke it at any time in Settings.

## How it works

| File                             | Role                                                                                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/content.ts`                 | Runs on auction sites. It shows the floating button only on lot pages (it watches for SPA navigation) and captures the page. The button lives in a closed shadow root, so site CSS can't affect it.                    |
| `src/lot.ts`                     | Pure helpers, unit-tested in `tests/extension.test.ts`. Lot detection reuses `lib/input/urls.ts`. Photo selection keeps auction-CDN photos and drops logos and icons. It also upgrades Copart thumbnails to full size. |
| `src/background.ts`              | Service worker. It sends the capture to `POST /api/extension/ingest` with `Authorization: Bearer <token>` and opens the report. `GET` on the same endpoint backs **Test connection**.                                  |
| `src/options.ts`, `src/popup.ts` | Settings page (app URL and token) and the toolbar popup ("Analyze this lot").                                                                                                                                          |

Limits match the server schema: page text up to 200k characters, HTML up to 2 MB (left out when larger), up to 20 JSON-LD blocks, and up to 80 photos.

The only permission requested is `storage`. Requests go to your app's origin, which answers with CORS headers for this endpoint, so no host permissions are needed.

## Publishing

Zip the contents of `extension/dist` and upload the zip to the Chrome Web Store developer dashboard. Before you upload:

- Set `EXTENSION_APP_URL` to your production URL.
- Bump `version` in the root `package.json`.
