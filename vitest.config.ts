import path from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

// Pass the string import.meta.url (not a URL object) to avoid the DOM-URL vs
// node-URL type clash under Expo's tsconfig.
const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    // Only the pure logic layer is unit-tested here; services/* are device-only.
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@": root,
    },
  },
})
