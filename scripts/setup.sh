#!/bin/bash
# FormAI — Quick Setup
# Run: chmod +x scripts/setup.sh && ./scripts/setup.sh

set -e

echo "═══════════════════════════════════════"
echo "  🏋️ FormAI — Quick Setup"
echo "═══════════════════════════════════════"
echo ""

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install
echo ""

# 2. Download fonts
echo "🔤 Downloading fonts..."
bash scripts/setup-fonts.sh
echo ""

# 3. Check for API key
if grep -q "YOUR_GEMINI_API_KEY" constants/config.ts 2>/dev/null; then
  echo "⚠️  IMPORTANT: You need to add your Gemini API key!"
  echo "   1. Go to https://aistudio.google.com"
  echo "   2. Create an API key (free)"
  echo "   3. Open constants/config.ts"
  echo "   4. Replace YOUR_GEMINI_API_KEY with your actual key"
  echo ""
fi

# 4. Done
echo "═══════════════════════════════════════"
echo "  ✅ Setup complete!"
echo ""
echo "  To run the app:"
echo "    npx expo start"
echo ""
echo "  Then scan the QR code with:"
echo "    iOS → Camera app"
echo "    Android → Expo Go app"
echo "═══════════════════════════════════════"
