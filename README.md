# FormAI — AI Gym Form Analyzer 🏋️

**AI rates your form.** Record or upload a video of your lift, get an instant AI-powered form score with detailed metric breakdowns, and share a beautiful Dark Cyber score card.

---

## Quick Start (3 minutes)

```bash
# 1. Extract the project and enter it
cd formai

# 2. Install dependencies
npm install

# 3. Run setup (downloads fonts + validates config)
node setup.js

# 4. Add your Gemini API key
#    Open constants/config.ts → replace YOUR_GEMINI_API_KEY
#    Get free key: https://aistudio.google.com

# 5. Start the app
npx expo start
```

Scan the QR code with **Expo Go** (Android) or your **Camera app** (iOS).

> **Important:** Camera/video features require a physical device, not a simulator.

---

## Tech Stack

| Layer      | Tech                                  | Why                                    |
| ---------- | ------------------------------------- | -------------------------------------- |
| Framework  | React Native + Expo SDK 52            | Cross-platform, fast iteration         |
| Navigation | Expo Router                           | File-based routing                     |
| AI Engine  | Google Gemini 2.0 Flash               | Native video analysis, cheapest option |
| Payments   | RevenueCat                            | Cross-platform IAP                     |
| Camera     | expo-camera + expo-image-picker       | Record or upload                       |
| Sharing    | react-native-view-shot + expo-sharing | Screenshot score card                  |
| Storage    | AsyncStorage                          | Offline-first, no backend              |
| Styling    | StyleSheet (custom design system)     | Dark Cyber theme                       |

---

## Project Structure

```
formai/
├── app/
│   ├── _layout.tsx              → Root layout (fonts, theme, navigation)
│   ├── index.tsx                → Entry point (onboarding check → redirect)
│   ├── onboarding/index.tsx     → 3-slide onboarding flow
│   ├── (tabs)/
│   │   ├── _layout.tsx          → Tab bar (Analyze + History)
│   │   ├── index.tsx            → Home screen (exercise picker + CTA)
│   │   └── history.tsx          → Past analyses list
│   ├── analyze.tsx              → Camera / upload → AI analysis
│   ├── result/[id].tsx          → Score card + feedback + share
│   └── paywall.tsx              → Premium upgrade (RevenueCat-ready)
├── components/
│   ├── ScoreCard.tsx            → ⭐ The viral shareable card (Dark Cyber)
│   └── AnalyzingOverlay.tsx     → Premium loading animation
├── constants/
│   ├── config.ts                → API keys + app configuration
│   ├── theme.ts                 → Design system (colors, fonts, spacing)
│   ├── exercises.ts             → Exercise definitions + scoring metrics
│   └── types.ts                 → TypeScript types
├── hooks/
│   └── useAnalysis.ts           → Analysis lifecycle hook
├── services/
│   ├── gemini.ts                → ⭐ AI prompt engineering + API calls
│   └── storage.ts               → Local persistence + free tier tracking
├── utils/
│   └── share.ts                 → Share text generation + card sharing
├── assets/fonts/                → Custom fonts (auto-downloaded by setup.js)
├── setup.js                     → Setup script (fonts + validation)
└── eas.json                     → EAS Build configuration
```

---

## How It Works

1. **User selects exercise** (Squat, Deadlift, or Bench Press)
2. **Records or uploads** a video (max 30 seconds)
3. **Video sent to Gemini 2.0 Flash** with a carefully engineered prompt per exercise
4. **AI returns structured JSON** with scores (0-10) for 4 metrics + coaching feedback
5. **Score card rendered** in Dark Cyber style with animated reveal
6. **User shares** the card to Instagram/TikTok/friends (the viral loop)

---

## Free vs Premium

| Feature    | Free    | Pro ($4.99/mo or $29.99/yr) |
| ---------- | ------- | --------------------------- |
| Analyses   | 3/week  | Unlimited                   |
| Score card | ✅      | ✅                          |
| Share      | ✅      | ✅                          |
| History    | Last 10 | Full history (50)           |
| Exercises  | 3       | All (expanding)             |

---

## Exercises & Metrics

### Barbell Back Squat

- **Depth** — Hip crease below knee line
- **Knee Tracking** — Knees over toes, no valgus
- **Back Angle** — Neutral spine maintained
- **Stability** — Even weight, controlled tempo

### Conventional Deadlift

- **Hip Hinge** — Proper initiation and loading
- **Back Position** — Neutral spine, no rounding
- **Lockout** — Full extension, glutes engaged
- **Bar Path** — Straight vertical, close to body

### Barbell Bench Press

- **Bar Path** — Slight arc from chest to lockout
- **Elbow Angle** — 45-75°, not flared
- **Arch & Setup** — Retracted scapulae, feet planted
- **Shoulder Health** — Shoulders pinned back and down

---

## Before App Store Submission

1. **Move API key to a proxy server** — Don't ship the Gemini key in the app binary. Use a Cloudflare Worker or Vercel Edge Function as a proxy.
2. **Set up RevenueCat** — Replace placeholder keys in `config.ts` with real RevenueCat API keys.
3. **Update `eas.json`** — Add your Apple ID, ASC App ID, and Team ID.
4. **App icons + splash** — Replace placeholder assets in `assets/`.
5. **Privacy Policy + Terms** — Required for App Store. Link from the paywall screen.

---

## Estimated Costs

| Component       | Cost at Launch     | At 10K users |
| --------------- | ------------------ | ------------ |
| Gemini API      | ~$5-10/mo          | ~$50-100/mo  |
| Apple Developer | $99/year           | $99/year     |
| Google Play     | $25 one-time       | $25 one-time |
| RevenueCat      | Free (< $2.5K MRR) | Free → 1%    |
| Proxy server    | $0-5/mo            | $5-10/mo     |

---

## Roadmap (V2+)

- [ ] More exercises (OHP, barbell row, curl, pull-up)
- [ ] Progress tracking graphs over time
- [ ] Before/after form comparisons
- [ ] Challenge friends to beat your score
- [ ] Video playback with AI annotations
- [ ] Personalized correction plans
- [ ] Premium score card designs
- [ ] Apple Watch companion
