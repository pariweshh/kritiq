#!/bin/bash
# Kritiq Font Setup Script
# Downloads all required Google Fonts to assets/fonts/

set -e

FONT_DIR="./assets/fonts"
mkdir -p "$FONT_DIR"

echo "🔤 Downloading Kritiq fonts..."

# Orbitron (techy score display)
echo "  → Orbitron Bold..."
curl -sL "https://github.com/google/fonts/raw/main/ofl/orbitron/static/Orbitron-Bold.ttf" -o "$FONT_DIR/Orbitron-Bold.ttf"
echo "  → Orbitron Black..."
curl -sL "https://github.com/google/fonts/raw/main/ofl/orbitron/static/Orbitron-Black.ttf" -o "$FONT_DIR/Orbitron-Black.ttf"

# Rajdhani (labels, headings)
echo "  → Rajdhani SemiBold..."
curl -sL "https://github.com/google/fonts/raw/main/ofl/rajdhani/Rajdhani-SemiBold.ttf" -o "$FONT_DIR/Rajdhani-SemiBold.ttf"
echo "  → Rajdhani Bold..."
curl -sL "https://github.com/google/fonts/raw/main/ofl/rajdhani/Rajdhani-Bold.ttf" -o "$FONT_DIR/Rajdhani-Bold.ttf"

# Space Mono (timestamps, technical text)
echo "  → Space Mono Regular..."
curl -sL "https://github.com/google/fonts/raw/main/ofl/spacemono/SpaceMono-Regular.ttf" -o "$FONT_DIR/SpaceMono-Regular.ttf"

echo ""
echo "✅ All fonts downloaded to $FONT_DIR/"
echo ""
ls -la "$FONT_DIR"
echo ""
echo "Next steps:"
echo "  1. Add your Gemini API key to constants/config.ts"
echo "  2. Run: npx expo start"
echo "  3. Scan QR code with your phone"
