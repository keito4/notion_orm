/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^chalk$": "<rootDir>/src/__mocks__/chalk.js",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
  testMatch: ["**/src/**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],

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
      branches: 5,
      functions: 10,
      lines: 15,
      statements: 15,
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
