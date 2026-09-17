import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: [
      "lib/breakfast-*.test.ts",
      "components/breakfast/**/*.test.tsx",
      "infra/cloudfront/**/*.test.ts",
      "lib/cx-*.test.ts",
      "lib/static-export-*.test.ts",
    ],
    setupFiles: ["./test/setup.ts"],
  },
});
