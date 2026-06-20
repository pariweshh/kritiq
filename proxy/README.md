# Kritiq coaching proxy

A tiny Cloudflare Worker that turns the app's **numbers-only** analysis output
into three coaching headlines via Gemini. This is the only place the Gemini API
key lives — it never ships in the mobile app.

## Privacy contract

The app sends only anonymous numbers (no video, frames, IDs, or PII):

```json
{
  "exercise": "bodyweight_squat",
  "overall": 78,
  "metrics": { "depth": 72, "torso": 84 },
  "angles": { "bottomKneeAngle": 98, "bottomTorsoLean": 22 },
  "lowConfidence": false
}
```

The Worker returns:

```json
{ "summary": "...", "topStrength": "...", "topImprovement": "..." }
```

The Worker logs nothing and is stateless. Model: `gemini-3.5-flash`.

## Deploy

```bash
cd proxy
npm install
npx wrangler login                       # one-time
npx wrangler secret put GEMINI_API_KEY   # paste the ROTATED key (see below)
npx wrangler secret put PROXY_SHARED_SECRET   # optional; any random string
npm run deploy
```

`wrangler deploy` prints the Worker URL (e.g. `https://kritiq-coach-proxy.<sub>.workers.dev`).

## Wire the app to it

The app reads the proxy URL + shared key from `EXPO_PUBLIC_*` env vars (see
`constants/config.ts` → `config.coaching`). Add to the app's `.env`:

```
EXPO_PUBLIC_COACH_PROXY_URL=https://kritiq-coach-proxy.<sub>.workers.dev
EXPO_PUBLIC_COACH_PROXY_KEY=<same value you set for PROXY_SHARED_SECRET>
```

> Note: `EXPO_PUBLIC_*` values are inlined into the client bundle, so the shared
> key is **not** secret-grade — it only deters casual abuse. Real protection is
> the rotated Gemini key (server-only) plus a Cloudflare rate-limit rule on the
> Worker route (configure in the Cloudflare dashboard → Security → WAF →
> Rate limiting). If `lowConfidence` is true the app skips the proxy entirely.

## Gemini key rotation (do this once)

The previous key was bundled into shipped builds via `EXPO_PUBLIC_GEMINI_API_KEY`,
so treat it as exposed:

1. Revoke / regenerate the key in Google AI Studio.
2. `wrangler secret put GEMINI_API_KEY` with the **new** key (here, never in the app).
3. Remove `EXPO_PUBLIC_GEMINI_API_KEY` from the app's `.env` — nothing reads it
   anymore (the client-side `services/gemini.ts` path was retired).

## Local dev

```bash
cp .dev.vars.example .dev.vars   # fill in values
npm run dev                      # wrangler dev on http://localhost:8787
```
