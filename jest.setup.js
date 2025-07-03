// Mock chalk to avoid ESM import issues
jest.mock('chalk', () => ({
  red: (str) => str,
  green: (str) => str,
  yellow: (str) => str,
  blue: (str) => str,
  cyan: (str) => str,
  magenta: (str) => str,
  white: (str) => str,
  gray: (str) => str,
  bold: (str) => str,
  dim: (str) => str,
  underline: (str) => str,
}));