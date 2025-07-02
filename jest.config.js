/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["**/src/**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  setupFiles: ["<rootDir>/jest.setup.js"],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html", "text-summary"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!dist/**",
    "!generated/**",
    "!coverage/**",
    "!node_modules/**",
  ],
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 30,
      lines: 55,
      statements: 40,
    },
  },
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/generated/",
    "/coverage/",
    "\\.test\\.",
    "\\.d\\.ts$",
  ],
};
