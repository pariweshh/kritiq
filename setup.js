#!/usr/bin/env node

/**
 * Kritiq Setup Script
 * Run: node setup.js
 *
 * Downloads required Google Fonts and validates project configuration.
 */

const fs = require("node:fs")
const path = require("node:path")
const https = require("node:https")

const FONTS_DIR = path.join(process.cwd(), "assets", "fonts")

// Google Fonts direct download URLs
const FONTS = [
  {
    name: "Orbitron.ttf",
    url: "https://raw.githubusercontent.com/google/fonts/main/ofl/orbitron/Orbitron%5Bwght%5D.ttf",
  },
  {
    name: "Rajdhani-SemiBold.ttf",
    url: "https://raw.githubusercontent.com/google/fonts/main/ofl/rajdhani/Rajdhani-SemiBold.ttf",
  },
  {
    name: "Rajdhani-Bold.ttf",
    url: "https://raw.githubusercontent.com/google/fonts/main/ofl/rajdhani/Rajdhani-Bold.ttf",
  },
  {
    name: "SpaceMono-Regular.ttf",
    url: "https://raw.githubusercontent.com/google/fonts/main/ofl/spacemono/SpaceMono-Regular.ttf",
  },
]

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const follow = (url, redirects = 0) => {
      if (redirects > 5) return reject(new Error("Too many redirects"))

      https
        .get(url, (res) => {
          // Handle redirects (GitHub sends 301/302)
          if (
            res.statusCode >= 300 &&
            res.statusCode < 400 &&
            res.headers.location
          ) {
            return follow(res.headers.location, redirects + 1)
          }

          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP ${res.statusCode} for ${url}`))
          }

          const file = fs.createWriteStream(dest)
          res.pipe(file)
          file.on("finish", () => {
            file.close()
            resolve()
          })
          file.on("error", (err) => {
            fs.unlink(dest, () => {})
            reject(err)
          })
        })
        .on("error", reject)
    }

    follow(url)
  })
}

async function downloadFonts() {
  // Create fonts directory
  if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true })
  }

  console.log("\n🔤  Downloading fonts...\n")

  for (const font of FONTS) {
    const dest = path.join(FONTS_DIR, font.name)

    if (fs.existsSync(dest)) {
      const stat = fs.statSync(dest)
      if (stat.size > 1000) {
        console.log(`  ✅ ${font.name} (already exists)`)
        continue
      }
    }

    process.stdout.write(`  ⬇️  ${font.name}...`)
    try {
      await download(font.url, dest)
      console.log(" ✅")
    } catch (err) {
      console.log(` ❌ Failed: ${err.message}`)
      console.log(
        `     → Download manually from Google Fonts and place in assets/fonts/`,
      )
    }
  }
}

function validateConfig() {
  console.log("\n🔧  Validating configuration...\n")

  // Check config file
  const configPath = path.join(process.cwd(), "constants", "config.ts")
  if (fs.existsSync(configPath)) {
    const configContent = fs.readFileSync(configPath, "utf-8")

    if (configContent.includes("YOUR_GEMINI_API_KEY")) {
      console.log("  ⚠️  Gemini API key not set")
      console.log(
        "     → Open constants/config.ts and replace YOUR_GEMINI_API_KEY",
      )
      console.log("     → Get your key from https://aistudio.google.com\n")
    } else {
      console.log("  ✅ Gemini API key configured")
    }

    if (configContent.includes("YOUR_REVENUECAT")) {
      console.log("  ℹ️  RevenueCat keys not set (optional for development)")
    } else {
      console.log("  ✅ RevenueCat keys configured")
    }
  }

  // Check node_modules
  if (fs.existsSync(path.join(process.cwd(), "node_modules"))) {
    console.log("  ✅ Dependencies installed")
  } else {
    console.log("  ⚠️  Dependencies not installed")
    console.log("     → Run: npm install\n")
  }

  // Check fonts
  let fontsOk = true
  for (const font of FONTS) {
    const fontPath = path.join(FONTS_DIR, font.name)
    if (!fs.existsSync(fontPath)) {
      fontsOk = false
      console.log(`  ❌ Missing font: ${font.name}`)
    }
  }
  if (fontsOk) {
    console.log("  ✅ All fonts present")
  }
}

function printNextSteps() {
  console.log("\n" + "─".repeat(50))
  console.log("\n🚀 Setup complete! Next steps:\n")
  console.log("  1. Add your Gemini API key to constants/config.ts")
  console.log("  2. Run: npm install")
  console.log("  3. Run: npx expo start")
  console.log("  4. Scan QR code with your phone\n")
  console.log("  Note: Camera features require a physical device.\n")
  console.log("─".repeat(50) + "\n")
}

async function main() {
  console.log("\n" + "═".repeat(50))
  console.log("  🏋️  Kritiq Setup")
  console.log("  AI rates your form")
  console.log("═".repeat(50))

  await downloadFonts()
  validateConfig()
  printNextSteps()
}

main().catch(console.error)
