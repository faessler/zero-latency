import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` throws when imported outside a React Server Component.
      // Stub it so server modules can be unit-tested under Node.
      "server-only": fileURLToPath(new URL("./test/stubs/empty.ts", import.meta.url)),
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
