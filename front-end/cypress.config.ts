import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.{ts,tsx,cy.ts}",
    supportFile: "cypress/support/e2e.ts",
  },
  env: {},
});
